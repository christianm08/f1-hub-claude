// Foto monoposto: solo dalla mappa curata per stagione ESATTA (data/assets.ts → CAR_PHOTOS).
// Senza corrispondenza esatta → fallback grafico in tinta team (non è una foto e non finge di esserlo).

import { CAR_PHOTOS, commonsUrl } from '../data/assets'
import { teamColor } from '../data/meta'

export function CarImage({ constructorId, season, name }: { constructorId: string; season: number; name: string }) {
  const photo = CAR_PHOTOS[constructorId]?.[season]
  const color = teamColor(constructorId)
  if (photo)
    return (
      <figure className="car-img" style={{ margin: 0 }}>
        <img src={commonsUrl(photo.file, 1000)} alt={`${name} ${season}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <figcaption className="sr-only">Wikimedia Commons, {photo.license}</figcaption>
      </figure>
    )
  return (
    <div className="car-img" role="img" aria-label={`${name} ${season}`} style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${color} 55%, #000), ${color} 60%, color-mix(in srgb, ${color} 70%, #fff))` }}>
      <svg viewBox="0 0 400 120" width="78%" aria-hidden style={{ opacity: 0.5 }}>
        <path d="M18 86 L60 80 L120 64 L170 58 L196 44 L232 44 L248 58 L330 62 L382 74 L384 86 L344 88 A22 22 0 0 0 300 88 L132 90 A22 22 0 0 0 88 90 Z" fill="#000" opacity=".55" />
        <circle cx="110" cy="90" r="18" fill="#000" opacity=".7" />
        <circle cx="322" cy="88" r="18" fill="#000" opacity=".7" />
      </svg>
      <span style={{ position: 'absolute', left: 16, bottom: 12, font: '900 italic 22px var(--md-ref-typeface-brand)', color: '#fff', textShadow: '0 2px 10px rgb(0 0 0 / .4)' }}>{season}</span>
    </div>
  )
}
