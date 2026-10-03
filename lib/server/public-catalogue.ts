import 'server-only'
import type { RecordData } from '@/lib/domain'
import { one, rows, transaction } from './db'

export type PublicCatalogue = {
  courses: RecordData[]
  programmes: RecordData[]
  featured?: RecordData[]
  stats?: { programmeCount: number; activeCourseCount: number; offeringCount: number }
}

export async function publicCatalogue(): Promise<PublicCatalogue> {
  return transaction(null, async db => ({
    courses: await rows<RecordData>(
      db,
      "SELECT c.id,c.code,c.title,c.description,c.level,c.credit_hours,d.name department_name FROM courses c JOIN departments d ON d.id=c.department_id WHERE c.status='active' ORDER BY c.code",
    ),
    programmes: await rows<RecordData>(
      db,
      "SELECT p.*,d.name department_name FROM programmes p JOIN departments d ON d.id=p.department_id WHERE p.status='active' ORDER BY p.name",
    ),
    featured: undefined,
    stats: undefined,
  }))
}

export async function publicCourse(id: string) {
  return transaction(null, async db =>
    one<RecordData>(
      db,
      "SELECT c.*,d.name department_name FROM courses c JOIN departments d ON d.id=c.department_id WHERE c.id=$1 AND c.status='active'",
      [id],
    ).catch(() => null),
  )
}
