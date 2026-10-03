'use client'

import { cn } from '@/lib/utils'

function splitSections(markdown: string): Array<{ title: string; body: string }> {
  const trimmed = markdown.trim()
  if (!trimmed) return []
  const parts = trimmed.split(/^##\s+/m).filter(Boolean)
  if (parts.length <= 1 && !trimmed.startsWith('##')) {
    return [{ title: 'Practice questions', body: trimmed }]
  }
  return parts.map(block => {
    const nl = block.indexOf('\n')
    const title = nl === -1 ? block.trim() : block.slice(0, nl).trim()
    const body = nl === -1 ? '' : block.slice(nl + 1).trim()
    return { title, body }
  })
}

function renderBlock(text: string) {
  const chunks = text.split(/^###\s+/m).filter(Boolean)
  if (chunks.length <= 1 && !text.includes('###')) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</p>
  }
  return (
    <ul className="space-y-3">
      {chunks.map((chunk, i) => {
        const nl = chunk.indexOf('\n')
        const heading = nl === -1 ? `Question ${i + 1}` : chunk.slice(0, nl).trim()
        const body = nl === -1 ? chunk : chunk.slice(nl + 1).trim()
        return (
          <li
            key={`${heading}-${i}`}
            className="rounded-lg border border-border/80 bg-muted/40 p-3 dark:bg-muted/20"
          >
            <h4 className="text-sm font-semibold text-foreground">{heading}</h4>
            {body ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function PracticeQuestionsDisplay({ content, className }: { content: string; className?: string }) {
  const sections = splitSections(content)
  return (
    <div className={cn('space-y-4', className)} aria-live="polite">
      {sections.map(section => (
        <section
          key={section.title}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
          aria-labelledby={`practice-${section.title.replace(/\s+/g, '-').slice(0, 40)}`}
        >
          <h3
            id={`practice-${section.title.replace(/\s+/g, '-').slice(0, 40)}`}
            className="text-base font-semibold text-foreground"
          >
            {section.title}
          </h3>
          <div className="mt-3">{renderBlock(section.body)}</div>
        </section>
      ))}
    </div>
  )
}
