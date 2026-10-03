import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { hashPassword } from 'better-auth/crypto'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Refusing to seed production. Set ALLOW_DEMO_SEED=true to override.')
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for seeding.')

const password = process.env.DEMO_ACCOUNT_PASSWORD
if (!password || password.length < 12) throw new Error('Set DEMO_ACCOUNT_PASSWORD (min 12 chars) in the environment.')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const db = await pool.connect()

const demoUsers = [
  { email: 'student@learnhub.demo', name: 'Demo Student', role: 'student' },
  { email: 'lecturer@learnhub.demo', name: 'Demo Lecturer', role: 'lecturer' },
  { email: 'admin@learnhub.demo', name: 'Demo Admin', role: 'admin' },
  { email: 'superadmin@learnhub.demo', name: 'Demo Super Admin', role: 'super_admin' },
]

async function ensureUser({ email, name, role }) {
  const existing = await db.query('SELECT id FROM "user" WHERE email=$1', [email])
  let userId = existing.rows[0]?.id
  const hash = await hashPassword(password)
  if (!userId) {
    userId = randomUUID()
    await db.query('INSERT INTO "user"(id,name,email,"emailVerified",role,"createdAt","updatedAt") VALUES($1,$2,$3,true,$4,now(),now())', [userId, name, email, role])
    await db.query('INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,now(),now())', [randomUUID(), userId, 'credential', userId, hash])
    await db.query('INSERT INTO profiles(user_id,status) VALUES($1,$2) ON CONFLICT DO NOTHING', [userId, 'active'])
  } else {
    await db.query('UPDATE "user" SET role=$2,name=$3,"emailVerified"=true WHERE id=$1', [userId, role, name])
    await db.query('UPDATE account SET "accountId"=$2, password=$3 WHERE "userId"=$1 AND "providerId"=$4', [userId, userId, hash, 'credential'])
  }
  return userId
}

try {
  await db.query('BEGIN')
  const ids = {}
  for (const u of demoUsers) ids[u.role] = await ensureUser(u)

  const fac = await db.query(`INSERT INTO faculties(name,code,description) VALUES('College of Basic & Applied Sciences','CBS','Demo faculty') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`)
  const facultyId = fac.rows[0].id
  const dep = await db.query(`INSERT INTO departments(faculty_id,name,code) VALUES($1,'Computer Science','CS') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [facultyId])
  const departmentId = dep.rows[0].id
  const prog = await db.query(`INSERT INTO programmes(department_id,name,code,degree_type,duration,description) VALUES($1,'BSc Computer Science','BSC-CS','BSc',4,'Demo programme') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [departmentId])
  const programmeId = prog.rows[0].id
  const term = await db.query(`INSERT INTO academic_terms(name,academic_year,start_date,end_date) VALUES('First Semester 2025/2026','2025/2026','2025-09-01','2026-01-15') RETURNING id`)
  const termId = term.rows[0]?.id ?? (await db.query(`SELECT id FROM academic_terms LIMIT 1`)).rows[0].id

  await db.query('UPDATE profiles SET programme_id=$2,level=200,department_id=$3 WHERE user_id=$1', [ids.student, programmeId, departmentId])

  for (let i = 1; i <= 25; i++) {
    await db.query(`INSERT INTO courses(code,title,description,level,department_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`, [`CSC ${100 + i}`, `Demo Course ${i}`, 'Fictional demo course.', 100 + (i % 4) * 100, departmentId])
  }
  const courses = (await db.query('SELECT id,code FROM courses ORDER BY code LIMIT 25')).rows
  const lecturerId = ids.lecturer
  for (let i = 0; i < Math.min(20, courses.length); i++) {
    const c = courses[i]
    await db.query(`INSERT INTO course_offerings(course_id,academic_term_id,lecturer_id,programme_id,level) VALUES($1,$2,$3,$4,200) ON CONFLICT DO NOTHING`, [c.id, termId, lecturerId, programmeId])
  }
  const offerings = (await db.query('SELECT id,course_id FROM course_offerings')).rows
  for (const o of offerings.slice(0, 5)) {
    await db.query(`INSERT INTO enrollments(student_id,course_offering_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [ids.student, o.id])
  }

  for (let i = 0; i < 40; i++) {
    const c = courses[i % courses.length]
    const status = i % 5 === 0 ? 'pending' : 'approved'
    await db.query(`INSERT INTO resources(course_id,uploaded_by,title,description,type,category,moderation_status,scan_status,visibility,allow_download) VALUES($1,$2,$3,$4,'PDF','Lecture Notes',$5,'clean','enrolled',true)`, [c.id, lecturerId, `Demo Resource ${i + 1}`, 'Seeded demo material.', status])
  }

  for (let i = 0; i < 10; i++) {
    const c = courses[i]
    const q = await db.query(`INSERT INTO quizzes(course_id,created_by,title,status,time_limit,max_attempts) VALUES($1,$2,$3,'published',30,3) RETURNING id`, [c.id, lecturerId, `Demo Quiz ${i + 1}`])
    const qid = q.rows[0].id
    const qq = await db.query(`INSERT INTO quiz_questions(quiz_id,prompt,type,points,position) VALUES($1,'Demo question?','true_false',1,0) RETURNING id`, [qid])
    await db.query('INSERT INTO quiz_options(question_id,label,position) VALUES($1,$2,0),($1,$3,1)', [qq.rows[0].id, 'True', 'False'])
    await db.query('INSERT INTO quiz_keys(question_id,answer) VALUES($1,$2)', [qq.rows[0].id, 'True'])
  }

  for (let i = 0; i < 15; i++) {
    await db.query(`INSERT INTO announcements(created_by,title,body,status,course_id) VALUES($1,$2,$3,'published',$4)`, [lecturerId, `Demo announcement ${i + 1}`, 'Fictional demo announcement body.', courses[i % courses.length].id])
  }
  await db.query(`INSERT INTO notifications(user_id,title,body,href) SELECT $1,'Welcome to UG LearnHub','Your demo workspace is ready.','/dashboard' WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=$1 AND title='Welcome to UG LearnHub')`, [ids.student])

  await db.query('COMMIT')
  console.log('Seed complete. Demo accounts:', demoUsers.map(u => u.email).join(', '))
} catch (error) {
  await db.query('ROLLBACK')
  throw error
} finally {
  db.release()
  await pool.end()
}
