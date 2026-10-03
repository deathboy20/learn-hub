'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { Suspense } from 'react'
import { WorkspaceSearch } from '@/components/workspace/workspace-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'
import { LearnHubMark } from '@/components/learnhub-mark'
import { Button } from '@/components/ui/button'
import { navForRole, showStudentAiFab } from '@/lib/navigation'
import { homeFor } from '@/lib/domain'
import { useWorkspace } from '@/hooks/use-workspace'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { AiAssistantFab } from '@/components/workspace/ai-assistant-fab'
import { SidebarUserCard } from '@/components/workspace/sidebar-user-card'
import type { Actor } from '@/lib/domain'
import { MobileBottomNav } from '@/components/workspace/mobile-bottom-nav'
import { useMobilePlatform } from '@/hooks/use-mobile-platform'
import { useIsMobileViewport } from '@/hooks/use-is-mobile-viewport'

function SidebarPanel({
  nav,
  pathname,
  actor,
  isLoading,
  onNavigate,
  showClose,
  onClose,
}: {
  nav: ReturnType<typeof navForRole>
  pathname: string
  actor: Pick<Actor, 'name' | 'email' | 'role' | 'image'> | undefined
  isLoading: boolean
  onNavigate?: () => void
  showClose?: boolean
  onClose?: () => void
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="[&_span]:text-white [&_span]:opacity-90">
          <LearnHubMark />
        </div>
        {showClose && (
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X className="size-5 text-white" />
          </button>
        )}
      </div>
      <nav className="workspace-sidebar-nav min-h-0 flex-1 space-y-0.5 p-3" aria-label="Workspace">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={item.description}
            onClick={onNavigate}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? 'bg-[var(--sidebar-accent)] text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        {isLoading ? (
          <p className="px-1 text-xs text-white/70">Loading account…</p>
        ) : actor ? (
          <SidebarUserCard actor={actor} onNavigate={onNavigate} />
        ) : null}
      </div>
    </>
  )
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data, isLoading, error } = useWorkspace()
  const isAuthenticated = Boolean(data?.actor)
  const platform = useMobilePlatform()
  const isMobileViewport = useIsMobileViewport()
  const navPlatform = !isMobileViewport ? 'desktop' : platform === 'desktop' ? 'android' : platform
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  const actor = data?.actor
  const nav = actor ? navForRole(actor.role) : []
  const unread = (data?.notifications ?? []).filter(n => !n.read && !n.read_at).length
  const isMobile = isMobileViewport

  async function logout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <p className="text-destructive">{error instanceof Error ? error.message : 'Workspace unavailable.'}</p>
        <Link href="/login" className="mt-4 text-primary">Sign in</Link>
      </div>
    )
  }

  if (!isLoading && isAuthenticated && !data) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <p className="text-muted-foreground">Your session expired. Sign in again to continue.</p>
        <Link href="/login" className="mt-4 text-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background supports-[height:100dvh]:max-h-dvh supports-[height:100dvh]:h-dvh">
      {/* Desktop: fixed sidebar (does not scroll with page content) */}
      <aside
        className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex"
        aria-label="Sidebar"
      >
        <SidebarPanel nav={nav} pathname={pathname} actor={actor} isLoading={isLoading} />
      </aside>

      {/* Mobile drawer (optional full nav) */}
      <aside
        className={cn(
          'workspace-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(100%,280px)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform duration-200 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!drawerOpen}
      >
        <SidebarPanel
          nav={nav}
          pathname={pathname}
          actor={actor}
          isLoading={isLoading}
          showClose
          onClose={() => setDrawerOpen(false)}
          onNavigate={() => setDrawerOpen(false)}
        />
      </aside>
      {drawerOpen && (
        <button type="button" className="fixed inset-0 z-[35] bg-black/40 md:hidden" aria-label="Close overlay" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="flex h-full min-h-0 flex-col md:pl-64">
        <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4 md:px-6">
          {isMobile && (
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open full menu" title="Full navigation menu">
              <Menu className="size-5 shrink-0" />
            </button>
          )}
          <Suspense fallback={<div className="h-9 min-w-0 flex-1 rounded-lg bg-muted/50" aria-hidden />}>
            <WorkspaceSearch className="max-w-xl md:max-w-md lg:max-w-xl" />
          </Suspense>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/notifications" className="relative rounded-lg p-2 hover:bg-muted" aria-label="Notifications" title="View notifications">
              <Bell className="size-4" />
              {unread > 0 && (
                <>
                  <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" aria-hidden />
                  <span className="sr-only">{unread} unread notifications</span>
                </>
              )}
            </Link>
            {actor && actor.role !== 'student' && (
              <Link href={homeFor(actor.role === 'lecturer' ? 'lecturer' : 'admin')} className="hidden text-xs text-primary sm:inline" title="Switch to your role workspace">
                Switch workspace
              </Link>
            )}
            <Button type="button" variant="ghost" size="icon-sm" onClick={logout} aria-label="Sign out" title="Sign out of LearnHub">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'workspace-main min-h-0 flex-1 p-4 motion-safe:animate-enter focus:outline-none md:p-6',
            isMobile ? 'pb-mobile-nav' : '',
          )}
        >
          {children}
        </main>
      </div>

      {actor && <MobileBottomNav role={actor.role} platform={navPlatform} />}
      {actor?.role === 'student' && showStudentAiFab(pathname) && (
        <AiAssistantFab role={actor.role} platform={navPlatform} />
      )}
    </div>
  )
}
