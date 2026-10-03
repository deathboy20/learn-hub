import { WorkspaceProviders } from '@/components/providers'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProviders>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProviders>
  )
}
