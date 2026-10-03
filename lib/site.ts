/** Canonical site URL for metadata, OG, and sitemap (no trailing slash). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'LearnHub',
  tagline: 'Academic learning workspace',
  description:
    'LearnHub helps students and lecturers discover courses, access moderated resources, take quizzes, track progress, and study with AI-assisted tools — all in one secure university workspace.',
  keywords: [
    'LearnHub',
    'learning management',
    'university courses',
    'lecture resources',
    'quizzes',
    'student progress',
    'academic workspace',
    'e-learning',
  ],
} as const
