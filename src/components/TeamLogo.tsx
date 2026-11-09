// Logo team: solo file con licenza libera su Wikimedia Commons (mappa curata o infobox Wikipedia
// ospitata su Commons). Senza versione libera → placeholder professionale, mai un logo protetto.

import { useEffect, useState } from 'react'
import { resolveTeamLogo, type ResolvedImage } from '../api/photos'
import { teamColor } from '../data/meta'

export function TeamLogo({ constructorId, name, wikiUrl, size = 40 }: { constructorId: string; name: string; wikiUrl?: string; size?: number }) {
  const [img, setImg] = useState<ResolvedImage | null | undefined>(undefined)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    let alive = true
    setImg(undefined)
    setBroken(false)
    resolveTeamLogo(constructorId, wikiUrl).then((r) => alive && setImg(r))
    return () => { alive = false }
  }, [constructorId, wikiUrl])

  const color = teamColor(constructorId)
  if (img && !broken)
    return (
      <span className="team-logo" style={{ width: size, height: size }} title={img.credit}>
        <img src={img.src} alt={name} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      </span>
    )
  const mono = name.replace(/F1 Team|Racing|Formula One|Team/gi, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || name[0]
  return (
    <span className="team-logo team-logo--ph" style={{ width: size, height: size, background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 40%, #000))`, fontSize: size * 0.36 }} aria-label={name}>
      {mono}
    </span>
  )
}
