import Link from 'next/link'
import { LearnHubMark } from '@/components/learnhub-mark'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <LearnHubMark compact variant="default" />
          <p className="mt-4 text-sm text-muted-foreground">
            LearnHub supports course discovery, moderated learning resources, assessments, and progress tracking for university study.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Explore</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li><Link href="/courses">Course catalogue</Link></li>
            <li><Link href="/programmes">Programmes</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Legal</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LearnHub
      </div>
    </footer>
  )
}
