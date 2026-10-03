'use client'

import { CourseDetail } from '@/components/workspace/course-detail'

export function CourseDetailClient({ courseId }: { courseId: string }) {
  return <CourseDetail courseId={courseId} />
}
