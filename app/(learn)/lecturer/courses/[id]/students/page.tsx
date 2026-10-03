import { redirect } from 'next/navigation'
import { currentActor } from '@/lib/server/session'
import { transaction, rows } from '@/lib/server/db'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor().catch(() => null)
  if (!actor || actor.role !== 'lecturer') redirect('/forbidden')
  const { id } = await params
  const students = await transaction(actor.id, db => rows(db, `SELECT u.name,u.email,e.enrolled_at FROM enrollments e JOIN "user" u ON u.id=e.student_id JOIN course_offerings o ON o.id=e.course_offering_id WHERE o.course_id=$1 AND o.lecturer_id=$2 AND e.status='active'`, [id, actor.id]))
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Course roster</h1>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">{students.map(s => (
        <li key={String(s.email)} className="flex justify-between p-3"><span>{String(s.name)}</span><span className="text-muted-foreground">{String(s.email)}</span></li>
      ))}</ul>
    </div>
  )
}
