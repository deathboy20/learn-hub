import type { Actor, RecordData } from '@/lib/domain'

export type ClientWorkspaceData = {
  actor: Actor
  courses: RecordData[]
  offerings: RecordData[]
  resources: RecordData[]
  quizzes: RecordData[]
  attempts: RecordData[]
  announcements: RecordData[]
  notifications: RecordData[]
  events: RecordData[]
  bookmarks: RecordData[]
  progress: RecordData[]
  notes: RecordData[]
  programmes: RecordData[]
  terms: RecordData[]
  activity: RecordData[]
  faculties: RecordData[]
  departments: RecordData[]
  levels: RecordData[]
}
