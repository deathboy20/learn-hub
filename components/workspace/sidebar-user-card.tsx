'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import type { Role } from '@/lib/domain'
import { cn } from '@/lib/utils'

function formatRole(role?: string) {
  if (!role) return 'Member'
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function SidebarUserCard({
  actor,
  className,
  onNavigate,
}: {
  actor: { name?: string; email?: string; role?: Role | string; image?: string | null }
  className?: string
  onNavigate?: () => void
}) {
  const name = actor.name?.trim() || 'LearnHub member'
  const email = actor.email?.trim() || ''
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <Link
      href="/profile"
      onClick={onNavigate}
      className={cn(
        'block rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10',
        className,
      )}
      title="Profile and account settings"
    >
      <div className="flex items-center gap-3">
        {actor.image ? (
          <Image
            src={String(actor.image)}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full object-cover ring-2 ring-white/20"
            unoptimized
          />
        ) : (
          <div
            className="grid size-11 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground ring-2 ring-white/20"
            aria-hidden
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {email ? <p className="truncate text-xs text-white/65">{email}</p> : null}
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-primary">
            {formatRole(actor.role)}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-white/50" aria-hidden />
      </div>
      <p className="mt-2 text-xs font-medium text-white/80">Profile &amp; settings</p>
    </Link>
  )
}
