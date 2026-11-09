// Bandiere SVG vendored (flag-icons, MIT) in src/assets/flags. Fallback: chip .nat con codice a 3 lettere.

const FLAGS = import.meta.glob('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const BY_ISO: Record<string, string> = {}
for (const [path, url] of Object.entries(FLAGS)) {
  const m = /\/([a-z]{2})\.svg$/.exec(path)
  if (m) BY_ISO[m[1]] = url
}

export function FlagIcon({ iso2, code, title, size = 18, round }: { iso2?: string; code: string; title?: string; size?: number; round?: boolean }) {
  const url = iso2 ? BY_ISO[iso2] : undefined
  if (!url) return <span className="nat" title={title} aria-label={title}>{code}</span>
  return (
    <img
      src={url}
      alt={title ?? code}
      title={title}
      className={round ? 'flag-round' : 'flag-img'}
      width={round ? size : Math.round(size * 4 / 3)}
      height={size}
      loading="lazy"
      decoding="async"
    />
  )
}
