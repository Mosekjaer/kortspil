import { useEffect, useState } from 'react'

/** The join link printed on a paper card, as if dealt onto the table. */
export function QrCard({ url, label }: { url: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    // Loaded on demand: only room lobbies need it.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toString(url, {
          type: 'svg',
          margin: 0,
          errorCorrectionLevel: 'M',
          color: { dark: '#17140f', light: '#00000000' },
        }),
      )
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(null))
    return () => {
      alive = false
    }
  }, [url])

  return (
    <div className="deal w-[min(34vw,10rem)] shrink-0" style={{ containerType: 'inline-size' }}>
      <div className="card-shape flex flex-col justify-between bg-card p-[9cqw] text-card-black">
        <div
          role="img"
          aria-label={label}
          className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
          // SVG generated locally by the qrcode library from our own URL.
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
        <span className="label truncate text-center text-[6cqw]">
          {url.replace(/^https?:\/\//, '')}
        </span>
      </div>
    </div>
  )
}
