'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { MobilePlatform } from '@/hooks/use-mobile-platform'
import { mobileTabsForRole, overflowNavForRole, type MobileTab, type MobileTabId } from '@/lib/navigation'
import type { Role } from '@/lib/domain'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const icons: Record<MobileTabId, LucideIcon> = {
  dashboard: LayoutDashboard,
  courses: BookOpen,
  resources: FolderOpen,
  quizzes: ClipboardList,
  upload: Upload,
  users: Users,
  more: MoreHorizontal,
}

function isActive(tab: MobileTab, pathname: string) {
  if (tab.match) return tab.match(pathname)
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

export function MobileBottomNav({ role, platform }: { role: Role; platform: MobilePlatform }) {
  const pathname = usePathname()
  const tabs = mobileTabsForRole(role)
  const [moreOpen, setMoreOpen] = useState(false)
  const overflow = overflowNavForRole(role, tabs)

  if (platform === 'desktop') return null

  const ios = platform === 'ios'

  return (
    <>
      {moreOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/40 md:hidden" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div
            className={cn(
              'fixed z-50 max-h-[70dvh] overflow-y-auto border border-border bg-background p-4 shadow-xl md:hidden',
              ios ? 'inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-2xl' : 'inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-t-2xl border-b-0',
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">All sections</p>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            <ul className="space-y-1">
              {overflow.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.description}
                    onClick={() => setMoreOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {ios ? (
        <div className="workspace-mobile-nav-ios md:hidden">
          <nav className="workspace-ios-pill" aria-label="Primary navigation">
            {tabs.map(tab => {
              const Icon = icons[tab.id]
              const active = tab.id === 'more' ? moreOpen || isActive(tab, pathname) : isActive(tab, pathname)
              if (tab.id === 'more') {
                return (
                  <button
                    key={tab.id}
                    type="button"
                    title={tab.description}
                    aria-label={tab.label}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen(o => !o)}
                    className={cn('workspace-ios-tab', active && 'workspace-ios-tab-active')}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                    <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                  </button>
                )
              }
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  title={tab.description}
                  className={cn('workspace-ios-tab', active && 'workspace-ios-tab-active')}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                  <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ) : (
        <nav className="workspace-mobile-nav-android md:hidden" aria-label="Primary navigation">
          {tabs.map(tab => {
            const Icon = icons[tab.id]
            const active = tab.id === 'more' ? moreOpen || isActive(tab, pathname) : isActive(tab, pathname)
            if (tab.id === 'more') {
              return (
                <button
                  key={tab.id}
                  type="button"
                  title={tab.description}
                  aria-label={tab.label}
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen(o => !o)}
                  className={cn('workspace-android-tab', active && 'workspace-android-tab-active')}
                >
                  <span className="workspace-android-indicator" aria-hidden />
                  <Icon className="size-6" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            }
            return (
              <Link key={tab.id} href={tab.href} title={tab.description} className={cn('workspace-android-tab', active && 'workspace-android-tab-active')}>
                <span className="workspace-android-indicator" aria-hidden />
                <Icon className="size-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
