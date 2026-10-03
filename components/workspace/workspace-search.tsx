'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function WorkspaceSearch({ className }: { className?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const initial = params.get('q') ?? ''
  const [query, setQuery] = useState(initial)

  useEffect(() => {
    setQuery(params.get('q') ?? '')
  }, [params])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.getElementById('workspace-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
    else router.push('/search')
  }

  return (
    <form onSubmit={submit} className={cn('flex min-w-0 flex-1 items-center gap-2', className)} role="search">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        id="workspace-search-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search courses, resources…"
        className="h-9 min-w-0 flex-1"
        aria-label="Search workspace"
        title="Search courses, resources, and quizzes (Ctrl+K)"
      />
    </form>
  )
}
