// Asset curati a mano. Regola: ogni voce deve avere licenza libera verificata singolarmente
// su Wikimedia Commons (CC BY / CC BY-SA / CC0 / pubblico dominio) PRIMA di essere aggiunta.
//
// Stato attuale: le mappe sono vuote di proposito. In questa build non è stato possibile
// verificare file per file le licenze su Commons, quindi non si inseriscono nomi di file non
// verificati. La risoluzione passa al livello 2 (miniatura infobox Wikipedia, accettata SOLO
// se ospitata su Commons, quindi con licenza libera) e poi al placeholder.
//
// Formato per aggiungere una voce verificata:
//   DRIVER_PHOTOS['max_verstappen'] = { file: 'Nome_file.jpg', license: 'CC BY-SA 4.0', focal: '50% 25%' }
//   TEAM_LOGOS['ferrari'] = { file: 'Nome_logo.svg', license: 'PD-textlogo' }
//   CAR_PHOTOS['ferrari'] = { 2024: { file: 'SF-24.jpg', license: 'CC BY-SA 4.0' } }

export interface CommonsAsset {
  /** nome del file su Wikimedia Commons (senza prefisso "File:") */
  file: string
  license: string
  author?: string
  /** focal point per object-position */
  focal?: string
}

/** chiave = driverId Jolpica */
export const DRIVER_PHOTOS: Record<string, CommonsAsset> = {}

/** chiave = constructorId Jolpica */
export const TEAM_LOGOS: Record<string, CommonsAsset> = {}

/** chiave = constructorId → stagione esatta → foto. Mai un'auto dell'anno sbagliato. */
export const CAR_PHOTOS: Record<string, Record<number, CommonsAsset>> = {}

/** URL di una miniatura Commons tramite Special:FilePath (deterministico). */
export function commonsUrl(file: string, width = 400): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`
}
