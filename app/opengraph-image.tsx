import { ImageResponse } from 'next/og'
import { OgBrandMark } from '@/lib/og-brand'
import { siteConfig } from '@/lib/site'

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: 'linear-gradient(135deg, #0f172a 0%, #134e45 45%, #1B6B5A 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <OgBrandMark size={120} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.02em' }}>{siteConfig.name}</div>
            <div style={{ fontSize: 28, opacity: 0.92, maxWidth: 720, lineHeight: 1.35 }}>{siteConfig.tagline}</div>
          </div>
        </div>
        <p
          style={{
            marginTop: 48,
            fontSize: 22,
            lineHeight: 1.5,
            opacity: 0.88,
            maxWidth: 900,
          }}
        >
          Courses, moderated resources, quizzes, progress tracking, and AI-assisted study for students and lecturers.
        </p>
      </div>
    ),
    { ...size },
  )
}
