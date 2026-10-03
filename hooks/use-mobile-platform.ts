'use client'

import { useEffect, useState } from 'react'

export type MobilePlatform = 'ios' | 'android' | 'desktop'

function detectPlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  if (!isMobile) return 'desktop'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'ios'
}

export function useMobilePlatform() {
  const [platform, setPlatform] = useState<MobilePlatform>('desktop')
  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])
  return platform
}
