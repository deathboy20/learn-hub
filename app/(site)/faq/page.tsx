export const metadata = { title: 'FAQ' }

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 space-y-6">
      <h1 className="text-3xl font-bold">FAQ</h1>
      <div><h2 className="font-semibold">How do I access materials?</h2><p className="text-sm text-muted-foreground">Enroll in a course, then open approved resources from your dashboard or library.</p></div>
      <div><h2 className="font-semibold">Are uploads instant?</h2><p className="text-sm text-muted-foreground">Lecturer uploads enter moderation before students can access them.</p></div>
    </div>
  )
}
