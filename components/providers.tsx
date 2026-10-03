'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { ConfirmDialogProvider } from '@/components/confirm-dialog'
import { GlobalActionLoader } from '@/components/global-action-loader'

/** Theme only — used on public and auth pages for a lighter first load. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="learnhub-theme">
      {children}
    </ThemeProvider>
  )
}

/** Workspace data, global action overlay, and toasts — learn routes only. */
export function WorkspaceProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }))
  return (
    <ConfirmDialogProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <GlobalActionLoader />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ConfirmDialogProvider>
  )
}
