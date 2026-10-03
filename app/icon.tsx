import { ImageResponse } from 'next/og'
import { OgBrandMark } from '@/lib/og-brand'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<OgBrandMark size={32} />, { ...size })
}
