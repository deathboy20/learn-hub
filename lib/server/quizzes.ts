import 'server-only'
import { z } from 'zod'
import { AppError, requirePermission, scoreQuiz, type Actor, type RecordData, type ScoringQuestion } from '@/lib/domain'
import { transaction, one, rows, audit } from './db'
import { courseAccess } from './access'
import { notifyCourse } from './mutations'
const uuid = z.string().uuid()
const questionSchema = z.object({ prompt: z.string().trim().min(1).max(3000), type: z.enum(['multiple_choice','true_false','short_answer']), points: z.number().int().min(1).max(100), options: z.array(z.string().trim().min(1).max(1000)).max(8), answer: z.string().trim().min(1).max(1000), explanation: z.string().max(3000).default('') }).strict().refine(q => q.type === 'short_answer' || (q.options.length >= 2 && q.options.includes(q.answer)), 'The correct answer must match an option.')
export async function saveQuiz(actor: Actor, input: unknown) {
  requirePermission(actor, 'quizzes.write')
  const value = z.object({ id: uuid.optional(), course_id: uuid, title: z.string().trim().min(1).max(250), description: z.string().max(5000).default(''), time_limit: z.number().int().min(1).max(240), max_attempts: z.number().int().min(1).max(20), status: z.enum(['draft','published','archived']), allow_review: z.boolean(), available_from: z.string().datetime().nullable(), available_until: z.string().datetime().nullable(), questions: z.array(questionSchema).min(1).max(100) }).strict().parse(input)
  return transaction(actor.id, async db => {
    await courseAccess(db, actor, value.course_id, true)
    if (value.id) {
      const previous = await one<RecordData>(db, 'SELECT * FROM quizzes WHERE id=$1 FOR UPDATE', [value.id])
      await courseAccess(db, actor, String(previous.course_id), true)
      const count = await one<{ count: string }>(db, 'SELECT count(*) FROM quiz_attempts WHERE quiz_id=$1', [value.id])
      if (Number(count.count)) throw new AppError(409, 'This quiz already has attempts. Create a new quiz to preserve existing results.')
    }
    const args = [value.course_id, value.title, value.description, value.time_limit, value.max_attempts, value.status, value.allow_review, value.available_from, value.available_until]
    const quiz = value.id ? await one<{ id: string }>(db, 'UPDATE quizzes SET course_id=$1,title=$2,description=$3,time_limit=$4,max_attempts=$5,status=$6,allow_review=$7,available_from=$8,available_until=$9,updated_at=now() WHERE id=$10 RETURNING id', [...args, value.id]) : await one<{ id: string }>(db, 'INSERT INTO quizzes(course_id,title,description,time_limit,max_attempts,status,allow_review,available_from,available_until,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [...args, actor.id])
    await db.query('DELETE FROM quiz_questions WHERE quiz_id=$1', [quiz.id])
    for (let i = 0; i < value.questions.length; i++) {
      const question = value.questions[i]
      const q = await one<{ id: string }>(db, 'INSERT INTO quiz_questions(quiz_id,prompt,type,points,position) VALUES($1,$2,$3,$4,$5) RETURNING id', [quiz.id, question.prompt, question.type, question.points, i])
      for (let j = 0; j < question.options.length; j++) await db.query('INSERT INTO quiz_options(question_id,label,position) VALUES($1,$2,$3)', [q.id, question.options[j], j])
      await db.query('INSERT INTO quiz_keys(question_id,answer,explanation) VALUES($1,$2,$3)', [q.id, question.answer, question.explanation])
    }
    await audit(db, actor.id, `quiz.${value.status}`, 'quiz', quiz.id)
    if (value.status === 'published') await notifyCourse(db, value.course_id, 'New quiz', value.title, `/quizzes/${quiz.id}`)
    return quiz
  })
}
export async function quizAction(actor: Actor, input: unknown) {
  const value = z.object({ action: z.enum(['start','save','submit']), quiz_id: uuid, attempt_id: uuid.optional(), answers: z.record(uuid, z.string().max(1000)).optional() }).strict().parse(input)
  return transaction(actor.id, async db => {
    const quiz = await one<RecordData>(db, 'SELECT * FROM quizzes WHERE id=$1 FOR UPDATE', [value.quiz_id])
    await courseAccess(db, actor, String(quiz.course_id))
    if (quiz.status !== 'published') throw new AppError(403, 'This quiz is not published.')
    if (value.action === 'start') {
      const now = Date.now()
      if ((quiz.available_from && new Date(String(quiz.available_from)).getTime() > now) || (quiz.available_until && new Date(String(quiz.available_until)).getTime() <= now)) throw new AppError(403, 'This quiz is outside its availability window.')
      const live = await rows<RecordData>(db, 'SELECT * FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2 AND submitted_at IS NULL', [value.quiz_id, actor.id])
      if (live[0]) return live[0]
      const count = await one<{ count: string }>(db, 'SELECT count(*) FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2', [value.quiz_id, actor.id])
      if (Number(count.count) >= Number(quiz.max_attempts)) throw new AppError(409, 'You have used all attempts for this quiz.')
      return one<RecordData>(db, `INSERT INTO quiz_attempts(quiz_id,user_id,expires_at) VALUES($1,$2,LEAST(now()+$3*interval '1 minute',COALESCE($4::timestamptz,'infinity'::timestamptz))) RETURNING *`, [value.quiz_id, actor.id, quiz.time_limit, quiz.available_until])
    }
    if (!value.attempt_id) throw new AppError(400, 'An attempt is required.')
    const attempt = await one<RecordData>(db, 'SELECT * FROM quiz_attempts WHERE id=$1 AND user_id=$2 AND quiz_id=$3 FOR UPDATE', [value.attempt_id, actor.id, value.quiz_id])
    if (attempt.submitted_at) return attempt
    const expired = new Date(String(attempt.expires_at)).getTime() <= Date.now()
    if (expired && value.action === 'save') throw new AppError(409, 'Time has expired. Submit your saved answers to see the result.')
    const questions = await rows<ScoringQuestion & { explanation: string }>(db, 'SELECT * FROM app_score_keys($1)', [value.quiz_id])
    const proposed = expired ? attempt.answers : (value.answers ?? attempt.answers)
    const answers = z.record(z.string(), z.string()).parse(proposed)
    if (Object.keys(answers).some(id => !questions.some(q => q.id === id))) throw new AppError(400, 'An answer belongs to a different quiz.')
    if (value.action === 'save') return one<RecordData>(db, 'UPDATE quiz_attempts SET answers=$2 WHERE id=$1 RETURNING *', [value.attempt_id, JSON.stringify(answers)])
    const result = scoreQuiz(questions, answers)
    for (const question of questions) await db.query('INSERT INTO quiz_answers(attempt_id,question_id,answer,points) VALUES($1,$2,$3,$4)', [value.attempt_id, question.id, answers[question.id] ?? '', scoreQuiz([question], answers).earned])
    const submitted = await one<RecordData>(db, 'UPDATE quiz_attempts SET answers=$2,earned=$3,total=$4,score=$5,submitted_at=now() WHERE id=$1 RETURNING *', [value.attempt_id, JSON.stringify(answers), result.earned, result.total, result.percentage])
    await audit(db, actor.id, 'quiz.submit', 'attempt', value.attempt_id)
    await db.query('INSERT INTO notifications(user_id,title,body,href) VALUES($1,$2,$3,$4)', [actor.id, 'Quiz result ready', `${quiz.title}: ${result.percentage}%`, `/quizzes/${value.quiz_id}/results`])
    return submitted
  })
}
export async function quizDetail(actor: Actor, id: string, author = false) {
  z.string().uuid().parse(id)
  return transaction(actor.id, async db => {
    const quiz = await one<RecordData>(db, 'SELECT * FROM quizzes WHERE id=$1', [id])
    await courseAccess(db, actor, String(quiz.course_id), author)
    if (author) requirePermission(actor, 'quizzes.write')
    else if (quiz.status !== 'published') throw new AppError(404, 'This quiz is unavailable.')
    const questions = await rows<RecordData>(db, `SELECT q.*,COALESCE((SELECT json_agg(json_build_object('id',o.id,'label',o.label) ORDER BY o.position) FROM quiz_options o WHERE o.question_id=q.id),'[]') options FROM quiz_questions q WHERE q.quiz_id=$1 ORDER BY q.position`, [id])
    const attempts = await rows<RecordData>(db, 'SELECT * FROM quiz_attempts WHERE quiz_id=$1 AND user_id=$2 ORDER BY started_at DESC', [id, actor.id])
    const reviewAllowed = Boolean(quiz.allow_review) && attempts.some(a => a.submitted_at) && (attempts.length >= Number(quiz.max_attempts) || Boolean(quiz.available_until && new Date(String(quiz.available_until)) < new Date()))
    const keys = author || reviewAllowed ? await rows<RecordData>(db, 'SELECT * FROM app_score_keys($1)', [id]) : []
    return { quiz, questions, attempts, keys, reviewAllowed }
  })
}
