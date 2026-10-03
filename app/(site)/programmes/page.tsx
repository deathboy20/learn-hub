import { publicCatalogue } from '@/lib/server/queries'

export const metadata = { title: 'Programmes' }

export default async function ProgrammesPage() {
  const { programmes } = await publicCatalogue().catch(() => ({ programmes: [] as Awaited<ReturnType<typeof publicCatalogue>>['programmes'] }))
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="text-3xl font-bold">Programmes</h1>
      <p className="mt-2 text-sm text-muted-foreground">{programmes.length} undergraduate and graduate programmes.</p>
      <ul className="mt-8 space-y-4">
        {programmes.map(p => (
          <li key={String(p.id)} className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">{String(p.name)} ({String(p.code)})</h2>
            <p className="text-sm text-muted-foreground">
              {String(p.department_name ?? 'Department')} · {String(p.degree_type ?? p.degreeType ?? 'Degree')} · {String(p.duration ?? '4')} years
            </p>
            {p.description ? <p className="mt-2 text-sm text-muted-foreground">{String(p.description)}</p> : null}
          </li>
        ))}
        {programmes.length === 0 && (
          <li className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No programmes are published yet. Seed demo data or add programmes from the admin workspace.
          </li>
        )}
      </ul>
    </div>
  )
}
