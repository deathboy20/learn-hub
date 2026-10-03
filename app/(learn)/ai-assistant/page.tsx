import { redirect } from 'next/navigation'

/** AI chat lives on the floating scholar button; keep route for old bookmarks. */
export default function AIAssistantPage() {
  redirect('/dashboard')
}
