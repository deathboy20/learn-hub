import { Suspense } from 'react'
import { SearchPage } from '@/components/workspace/misc-pages'
export default function Page() { return <Suspense fallback={<p>Loading…</p>}><SearchPage /></Suspense> }
