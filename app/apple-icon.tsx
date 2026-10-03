import { ImageResponse } from 'next/og'
import { OgBrandMark } from '@/lib/og-brand'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<OgBrandMark size={180} />, { ...size })
}
