/** Authentication is handled by Supabase Auth (see `middleware.ts` and `components/auth-form.tsx`). */
export function GET() {
  return new Response('Authentication is handled by Supabase Auth.', { status: 404 })
}

export function POST() {
  return new Response('Authentication is handled by Supabase Auth.', { status: 404 })
}
