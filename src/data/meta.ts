// Metadati statici: colori team, codici paese/nazionalità, continenti.
// Nessun dato sportivo qui: solo tabelle di lookup per la presentazione.

export const TEAM_COLORS: Record<string, string> = {
  red_bull: '#3671C6',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  aston_martin: '#229971',
  alpine: '#0093CC',
  williams: '#64C4FF',
  rb: '#6692FF',
  racing_bulls: '#6692FF',
  alphatauri: '#5E8FAA',
  toro_rosso: '#469BFF',
  sauber: '#52E252',
  kick_sauber: '#52E252',
  audi: '#BB0A30',
  alfa: '#C92D4B',
  haas: '#B6BABD',
  cadillac: '#C4A55A',
  renault: '#FFF500',
  racing_point: '#F596C8',
  force_india: '#F596C8',
  lotus_f1: '#FFB800',
  manor: '#ED1C24',
  marussia: '#6E0000',
  caterham: '#048646',
}

export function teamColor(constructorId?: string): string {
  return (constructorId && TEAM_COLORS[constructorId]) || '#8a8f98'
}

/** nazionalità Jolpica → [ISO 3166-1 alpha-2, codice a 3 lettere] */
export const NATIONALITY: Record<string, [string, string]> = {
  British: ['gb', 'GBR'], English: ['gb', 'GBR'], Scottish: ['gb', 'GBR'], Welsh: ['gb', 'GBR'],
  Dutch: ['nl', 'NED'], Monegasque: ['mc', 'MON'], Spanish: ['es', 'ESP'], Mexican: ['mx', 'MEX'],
  Australian: ['au', 'AUS'], Canadian: ['ca', 'CAN'], French: ['fr', 'FRA'], German: ['de', 'GER'],
  Finnish: ['fi', 'FIN'], Danish: ['dk', 'DEN'], Thai: ['th', 'THA'], Japanese: ['jp', 'JPN'],
  Chinese: ['cn', 'CHN'], American: ['us', 'USA'], Italian: ['it', 'ITA'], 'New Zealander': ['nz', 'NZL'],
  Argentine: ['ar', 'ARG'], Argentinian: ['ar', 'ARG'], Brazilian: ['br', 'BRA'], Swiss: ['ch', 'SUI'],
  Swedish: ['se', 'SWE'], Austrian: ['at', 'AUT'], Belgian: ['be', 'BEL'], Polish: ['pl', 'POL'],
  Russian: ['ru', 'RUS'], Venezuelan: ['ve', 'VEN'], Colombian: ['co', 'COL'], Indonesian: ['id', 'INA'],
  Indian: ['in', 'IND'], 'South African': ['za', 'RSA'], Irish: ['ie', 'IRL'], Portuguese: ['pt', 'POR'],
  Chilean: ['cl', 'CHI'], Czech: ['cz', 'CZE'], 'Liechtensteiner': ['li', 'LIE'], Malaysian: ['my', 'MAS'],
  Uruguayan: ['uy', 'URU'], Hungarian: ['hu', 'HUN'], 'Rhodesian': ['', 'RHO'], 'East German': ['de', 'GDR'],
  Moroccan: ['ma', 'MAR'], Peruvian: ['pe', 'PER'], Korean: ['kr', 'KOR'], 'South Korean': ['kr', 'KOR'],
  Emirati: ['ae', 'UAE'], Turkish: ['tr', 'TUR'], Ecuadorian: ['ec', 'ECU'],
}

/** paese (come restituito da Jolpica per i circuiti) → [ISO2, codice 3 lettere, continente] */
export const COUNTRY: Record<string, [string, string, Continent]> = {
  Australia: ['au', 'AUS', 'oceania'],
  Bahrain: ['bh', 'BHR', 'asia'],
  China: ['cn', 'CHN', 'asia'],
  Japan: ['jp', 'JPN', 'asia'],
  'Saudi Arabia': ['sa', 'KSA', 'asia'],
  USA: ['us', 'USA', 'americas'],
  'United States': ['us', 'USA', 'americas'],
  Italy: ['it', 'ITA', 'europe'],
  Monaco: ['mc', 'MON', 'europe'],
  Spain: ['es', 'ESP', 'europe'],
  Canada: ['ca', 'CAN', 'americas'],
  Austria: ['at', 'AUT', 'europe'],
  UK: ['gb', 'GBR', 'europe'],
  'United Kingdom': ['gb', 'GBR', 'europe'],
  Hungary: ['hu', 'HUN', 'europe'],
  Belgium: ['be', 'BEL', 'europe'],
  Netherlands: ['nl', 'NED', 'europe'],
  Azerbaijan: ['az', 'AZE', 'asia'],
  Singapore: ['sg', 'SGP', 'asia'],
  Mexico: ['mx', 'MEX', 'americas'],
  Brazil: ['br', 'BRA', 'americas'],
  Qatar: ['qa', 'QAT', 'asia'],
  UAE: ['ae', 'UAE', 'asia'],
  'United Arab Emirates': ['ae', 'UAE', 'asia'],
  France: ['fr', 'FRA', 'europe'],
  Germany: ['de', 'GER', 'europe'],
  Portugal: ['pt', 'POR', 'europe'],
  Russia: ['ru', 'RUS', 'europe'],
  Turkey: ['tr', 'TUR', 'europe'],
  Malaysia: ['my', 'MAS', 'asia'],
  Korea: ['kr', 'KOR', 'asia'],
  'South Korea': ['kr', 'KOR', 'asia'],
  India: ['in', 'IND', 'asia'],
  Argentina: ['ar', 'ARG', 'americas'],
  'South Africa': ['za', 'RSA', 'africa'],
  Sweden: ['se', 'SWE', 'europe'],
  Switzerland: ['ch', 'SUI', 'europe'],
  Morocco: ['ma', 'MAR', 'africa'],
}

export type Continent = 'europe' | 'asia' | 'americas' | 'oceania' | 'africa'
export const CONTINENTS: Continent[] = ['europe', 'asia', 'americas', 'oceania', 'africa']

export function natInfo(nationality?: string): { iso2: string; code: string } {
  const n = nationality ? NATIONALITY[nationality] : undefined
  return { iso2: n?.[0] ?? '', code: n?.[1] ?? (nationality ? nationality.slice(0, 3).toUpperCase() : '—') }
}

export function countryInfo(country?: string): { iso2: string; code: string; continent: Continent | null } {
  const c = country ? COUNTRY[country] : undefined
  return { iso2: c?.[0] ?? '', code: c?.[1] ?? (country ? country.slice(0, 3).toUpperCase() : '—'), continent: c?.[2] ?? null }
}

/** codici paese OpenF1 (3 lettere stile FIA) → ISO2 */
export const FIA_TO_ISO2: Record<string, string> = {
  GBR: 'gb', NED: 'nl', MON: 'mc', ESP: 'es', MEX: 'mx', AUS: 'au', CAN: 'ca', FRA: 'fr', GER: 'de', FIN: 'fi',
  DEN: 'dk', THA: 'th', JPN: 'jp', CHN: 'cn', USA: 'us', ITA: 'it', NZL: 'nz', ARG: 'ar', BRA: 'br', SUI: 'ch',
  SWE: 'se', AUT: 'at', BEL: 'be', POL: 'pl', RUS: 'ru', BHR: 'bh', KSA: 'sa', SAU: 'sa', AZE: 'az', SGP: 'sg',
  QAT: 'qa', UAE: 'ae', ARE: 'ae', HUN: 'hu', POR: 'pt', TUR: 'tr', MAS: 'my', IND: 'in', RSA: 'za',
}
