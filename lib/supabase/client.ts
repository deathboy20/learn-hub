import { createBrowserClient } from '@supabase/ssr'
import { requireSupabasePublicEnv } from './env'

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabasePublicEnv()
  return createBrowserClient(url, anonKey)
}
