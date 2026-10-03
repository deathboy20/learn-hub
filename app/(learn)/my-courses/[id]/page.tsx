import { CourseDetailClient } from '@/components/workspace/course-detail-client'

export const metadata = { title: 'Course' }

export default async function MyCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CourseDetailClient courseId={id} />
}
