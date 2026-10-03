'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { postQuiz } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FieldGroup } from '@/components/ui/label'
import { WorkspacePageHeader } from '@/components/workspace/workspace-page-header'

export default function CreateQuizPage() {
  const { data } = useWorkspace()
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const courses = (data?.offerings as Array<Record<string, unknown>> | undefined)?.filter(o => String(o.lecturer_id) === data?.actor.id) ?? []

  return (
    <form className="mx-auto max-w-lg space-y-6" onSubmit={async e => {
      e.preventDefault()
      await postQuiz(
        {
          course_id: courseId,
          title,
          description: '',
          time_limit: 30,
          max_attempts: 3,
          status: 'draft',
          allow_review: true,
          available_from: null,
          available_until: null,
          questions: [{ prompt: 'Sample question?', type: 'true_false', points: 1, options: ['True', 'False'], answer: 'True', explanation: '' }],
        },
        true,
      )
      toast.success('Quiz created')
    }}>
      <WorkspacePageHeader title="Create quiz" description="Save a draft quiz, then add questions and publish when ready." />
      <FieldGroup label="Course">
        <Select value={courseId} onChange={e => setCourseId(e.target.value)} required aria-label="Course">
          <option value="">Select course</option>
          {courses.map(c => <option key={String(c.id)} value={String(c.course_id)}>{String(c.code)}</option>)}
        </Select>
      </FieldGroup>
      <FieldGroup label="Title">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" required />
      </FieldGroup>
      <Button type="submit">Save draft</Button>
    </form>
  )
}
