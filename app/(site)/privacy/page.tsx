export const metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 prose dark:prose-invert">
      <h1>Privacy</h1>
      <p>Learning activity, uploads, and audit events are stored in PostgreSQL. Files are stored in private object storage with authorized access only.</p>
    </div>
  )
}
