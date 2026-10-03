import Link from 'next/link'
import { LearnHubMark } from '@/components/learnhub-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/courses', label: 'Courses' },
  { href: '/programmes', label: 'Programmes' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <LearnHubMark variant="default" />
        <nav className="hidden flex-1 items-center gap-5 md:flex" aria-label="Primary">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Sign in</Link>
          <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>Get started</Link>
        </div>
      </div>
    </header>
  )
}
