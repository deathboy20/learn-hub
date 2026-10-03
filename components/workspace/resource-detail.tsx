'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { postAction } from '@/lib/client/mutate'
import { ComingSoonDialog } from '@/components/coming-soon-dialog'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/workspace/loading-state'

export function ResourceDetail() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { data, isLoading } = useWorkspace()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [saving, setSaving] = useState(false)
  const resource = (data?.resources as Array<Record<string, unknown>> | undefined)?.find(r => String(r.id) === resourceId)
  const progress = (data?.progress as Array<Record<string, unknown>> | undefined)?.find(p => String(p.resource_id) === resourceId)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !resource || !resourceId) return
    const save = () => {
      const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0
      void postAction('progress', {
        resource_id: resourceId,
        percentage: pct,
        playback_position: video.currentTime,
        completed: pct >= 95,
      })
    }
    video.addEventListener('pause', save)
    return () => video.removeEventListener('pause', save)
  }, [resource, resourceId])

  async function bookmark() {
    setSaving(true)
    try {
      await postAction('bookmark', { resource_id: resourceId, saved: true })
      toast.success('Bookmark updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (!resource) return <p className="text-destructive">Resource not found or not accessible.</p>

  const isVideo = String(resource.mime_type ?? '').startsWith('video/') || String(resource.type).toLowerCase() === 'video'
  const isPdf = String(resource.mime_type) === 'application/pdf' || String(resource.type).toLowerCase() === 'pdf'
  const fileUrl = `/api/resources/${resourceId}/file`
  const pct = Number(progress?.percentage ?? 0)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{String(resource.title)}</h1>
        <p className="text-sm text-muted-foreground">{String(resource.description)}</p>
        {pct > 0 && <p className="text-xs text-muted-foreground">Your progress: {Math.round(pct)}%</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <ComingSoonDialog feature="Resource download" description="You can browse resource metadata in this release">
          {open => (
            <Button type="button" variant="outline" size="sm" onClick={open}>
              Download
            </Button>
          )}
        </ComingSoonDialog>
        <Button disabled={saving} onClick={bookmark} title="Save to bookmarks">Bookmark</Button>
        <Button
          variant="secondary"
          title="Mark this resource as complete"
          onClick={async () => {
            await postAction('progress', { resource_id: resourceId, percentage: 100, playback_position: 0, completed: true })
            toast.success('Marked complete')
          }}
        >
          Mark complete
        </Button>
      </div>
      {isVideo && (
        <video ref={videoRef} controls className="w-full rounded-xl border border-border bg-black" src={fileUrl}>
          <track kind="captions" />
        </video>
      )}
      {isPdf && !isVideo && (
        <iframe title={String(resource.title)} src={fileUrl} className="h-[70vh] w-full rounded-xl border border-border bg-white" />
      )}
      {!isVideo && !isPdf && (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm">Preview is not available for this file type. Use download if permitted.</p>
      )}
    </div>
  )
}
