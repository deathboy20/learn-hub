export default function AdminStoragePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-sm">
      <h1 className="text-2xl font-bold">Storage</h1>
      <p>Private object storage via Vercel Blob. Configure <code>BLOB_READ_WRITE_TOKEN</code> in the server environment.</p>
      <p>Upload intents expire after one hour; orphaned blobs should be cleaned by a scheduled worker (integration point).</p>
    </div>
  )
}
