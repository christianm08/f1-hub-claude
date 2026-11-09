// Ritratto pilota: aspect 1:1, object-fit cover con focal point, backdrop in tinta team.
// Livelli: mappa curata → miniatura infobox Wikipedia (solo se su Commons) → placeholder
// (versione "archivio" seppia per piloti pre-2000 senza foto). Mai foto di altri piloti.

import { useEffect, useState } from 'react'
import { resolveDriverPhoto, resolveTeamLogo, type ResolvedImage } from '../api/photos'
import { teamColor } from '../data/meta'

export function DriverPhoto({ driverId, name, wikiUrl, teamId, size = 48, era }: {
  driverId: string
  name: string
  wikiUrl?: string
  teamId?: string
  size?: number
  /** ultima stagione nota del pilota: < 2000 → placeholder archivio */
  era?: number
}) {
  const [img, setImg] = useState<ResolvedImage | null | undefined>(undefined)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    let alive = true
    setImg(undefined)
    setBroken(false)
    resolveDriverPhoto(driverId, wikiUrl).then((r) => alive && setImg(r))
    return () => { alive = false }
  }, [driverId, wikiUrl])

  const color = teamColor(teamId)
  const initials = name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const archive = era !== undefined && era < 2000
  const bg = archive ? '#7a6248' : `linear-gradient(160deg, ${color}, color-mix(in srgb, ${color} 45%, #000))`

  return (
    <span className={`avatar${archive && (!img || broken) ? ' avatar--archive' : ''}`} style={{ width: size, height: size, background: bg }} title={img && !broken ? img.credit : undefined}>
      {img && !broken ? (
        <img src={img.src} alt={name} loading="lazy" decoding="async" style={{ objectPosition: img.focal ?? '50% 22%' }} onError={() => setBroken(true)} />
      ) : (
        <span className="avatar__ph" style={{ fontSize: Math.max(11, size * 0.32) }} aria-label={name}>{initials}</span>
      )}
    </span>
  )
}

/** Attribuzione visibile (autore · licenza · Commons) per la foto del pilota. */
export function PhotoCredit({ driverId, wikiUrl, teamId, kind = 'driver' }: { driverId: string; wikiUrl?: string; teamId?: string; kind?: 'driver' | 'team' }) {
  const [img, setImg] = useState<ResolvedImage | null>(null)
  useEffect(() => {
    let alive = true
    const p = kind === 'driver' ? resolveDriverPhoto(driverId, wikiUrl) : resolveTeamLogo(teamId ?? driverId, wikiUrl)
    p.then((r) => alive && setImg(r))
    return () => { alive = false }
  }, [driverId, wikiUrl, teamId, kind])
  if (!img) return null
  return (
    <p className="note photo-credit">
      {kind === 'driver' ? 'Foto' : 'Logo'}:{' '}
      {img.page ? <a href={img.page} target="_blank" rel="noopener noreferrer">{img.credit}</a> : img.credit}
    </p>
  )
}
