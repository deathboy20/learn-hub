export type ResourceType =
  | 'pdf'
  | 'document'
  | 'slide'
  | 'video'
  | 'audio'
  | 'image'
  | 'link'
  | 'other'

export function inferResourceType(mime: string, fileName: string): ResourceType {
  const m = mime.toLowerCase()
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (m.includes('pdf') || ext === 'pdf') return 'pdf'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m.startsWith('image/')) return 'image'
  if (m.includes('presentation') || ext === 'ppt' || ext === 'pptx') return 'slide'
  if (m.includes('word') || ext === 'doc' || ext === 'docx') return 'document'
  return 'other'
}
