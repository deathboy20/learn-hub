'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { EmptyState, LoadingState } from '@/components/workspace/loading-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function ResourceLibrary({ categoryFilter }: { categoryFilter?: string }) {
  const { data, isLoading } = useWorkspace()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')

  const items = useMemo(() => {
    let list = (data?.resources ?? []) as Array<Record<string, unknown>>
    if (categoryFilter) {
      const cf = categoryFilter.toLowerCase()
      list = list.filter(r => {
        const cat = String(r.category ?? '').toLowerCase()
        const title = String(r.title ?? '').toLowerCase()
        if (cat === cf) return true
        if (cf.includes('past') && (cat.includes('past') || title.includes('past question'))) return true
        return false
      })
    }
    if (type !== 'all') list = list.filter(r => String(r.type).toLowerCase() === type)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(r => String(r.title).toLowerCase().includes(q) || String(r.description).toLowerCase().includes(q))
    }
    return list.sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
  }, [data?.resources, categoryFilter, query, type])

  if (isLoading) return <LoadingState />
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{categoryFilter ?? 'Resource library'}</h1>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search resources" value={query} onChange={e => setQuery(e.target.value)} className="max-w-sm" />
        <Select className="w-[160px]" value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="docx">DOCX</option>
        </Select>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map(r => (
          <li key={String(r.id)} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <Link href={`/resources/${r.id}`} className="font-medium hover:text-primary">{String(r.title)}</Link>
              <p className="text-xs text-muted-foreground">{String(r.code)} · {String(r.type)} · {String(r.category)}</p>
            </div>
            <span className="text-xs text-muted-foreground">{Number(r.view_count ?? 0)} views</span>
          </li>
        ))}
        {items.length === 0 && <li className="p-6"><EmptyState title="No resources found" description="Try another filter or check back after your lecturer publishes materials." /></li>}
      </ul>
    </div>
  )
}
