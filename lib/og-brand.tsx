/** Shared JSX for generated OG / icon images (next/og ImageResponse). */
export function OgBrandMark({ size = 96 }: { size?: number }) {
  const cap = Math.round(size * 0.42)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: 'linear-gradient(145deg, #1B6B5A 0%, #145548 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 12px 40px rgba(27, 107, 90, 0.35)',
      }}
    >
      <svg width={cap} height={cap} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3L2 8v6c0 5 4.5 8.5 10 9 5.5-.5 10-4 10-9V8l-10-5z"
          fill="white"
          fillOpacity={0.95}
        />
        <path
          d="M12 7v10M8 11h8"
          stroke="#1B6B5A"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
