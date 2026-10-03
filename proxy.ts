import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = new Set([
  '/',
  '/about',
  '/courses',
  '/programmes',
  '/faq',
  '/contact',
  '/terms',
  '/privacy',
  '/resources',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
])

const authPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password'])

function isPublic(pathname: string) {
  if (publicPaths.has(pathname)) return true
  if (pathname.startsWith('/courses/') && pathname !== '/courses') return true
  return false
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKey) {
    if (!isPublic(pathname) && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login?reason=config', request.url))
    }
    return response
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (authPaths.has(pathname) && user) {
    if (request.nextUrl.searchParams.get('reason') === 'stale') return response
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublic(pathname) && !pathname.startsWith('/api/') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
