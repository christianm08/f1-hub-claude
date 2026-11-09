"""Converte le geometrie bacinger/f1-circuits (MIT) in path SVG per src/data/tracks.ts."""
import json, math, sys
MAP = {'au-1953':'albert_park','bh-2002':'bahrain','cn-2004':'shanghai','es-1991':'catalunya','mc-1929':'monaco',
'ca-1978':'villeneuve','fr-1969':'ricard','at-1969':'red_bull_ring','gb-1948':'silverstone','de-1932':'hockenheimring',
'hu-1986':'hungaroring','be-1925':'spa','it-1922':'monza','sg-2008':'marina_bay','ru-2014':'sochi','jp-1962':'suzuka',
'us-2012':'americas','mx-1962':'rodriguez','br-1940':'interlagos','ae-2009':'yas_marina','it-1953':'imola',
'de-1927':'nurburgring','pt-2008':'portimao','it-1914':'mugello','my-1999':'sepang','tr-2005':'istanbul',
'nl-1948':'zandvoort','fr-1960':'magny_cours','pt-1972':'estoril','br-1977':'jacarepagua','sa-2021':'jeddah',
'us-2022':'miami','qa-2004':'losail','es-2026':'madring','az-2016':'baku','us-2023':'vegas','us-1909':'indianapolis',
'ar-1952':'galvez','za-1961':'kyalami','us-1956':'watkins_glen'}
d = json.load(open(sys.argv[1]))
out = []
for f in d['features']:
    p = f['properties']; cid = MAP.get(p['id'])
    if not cid: continue
    pts = f['geometry']['coordinates']
    lat0 = sum(c[1] for c in pts)/len(pts); k = math.cos(math.radians(lat0))
    xy = [(c[0]*k, -c[1]) for c in pts]
    minx=min(x for x,_ in xy); maxx=max(x for x,_ in xy); miny=min(y for _,y in xy); maxy=max(y for _,y in xy)
    s = 1000/max(maxx-minx, maxy-miny)
    w = round((maxx-minx)*s); h = round((maxy-miny)*s)
    path = 'M' + ' L'.join(f'{(x-minx)*s:.1f} {(y-miny)*s:.1f}' for x,y in xy) + ' Z'
    sx, sy = (xy[0][0]-minx)*s, (xy[0][1]-miny)*s
    out.append(f"  {cid}: {{ name: {json.dumps(p['Name'])}, location: {json.dumps(p['Location'])}, lengthM: {p.get('length') or 'null'}, opened: {p.get('opened') or 'null'}, firstGp: {p.get('firstgp') or 'null'}, w: {w}, h: {h}, start: [{sx:.1f}, {sy:.1f}], d: '{path}' }},")
print("""// Geometrie dei tracciati generate da scripts/build-tracks.py
// Fonte: https://github.com/bacinger/f1-circuits — MIT License,
// Copyright (c) 2019-2025 Tomislav Bacinger. Repository non ufficiale, non affiliato
// alle società della Formula 1. I marchi F1® appartengono a Formula One Licensing B.V.
// Chiave = circuitId Jolpica.

export interface TrackShape {
  name: string
  location: string
  /** lunghezza in metri dichiarata dal dataset MIT (null se assente) */
  lengthM: number | null
  opened: number | null
  firstGp: number | null
  w: number
  h: number
  start: [number, number]
  d: string
}

export const TRACKS: Record<string, TrackShape> = {""")
print('\n'.join(out))
print("}\n\nexport const TRACK_SOURCE = { name: 'bacinger/f1-circuits', url: 'https://github.com/bacinger/f1-circuits', license: 'MIT', copyright: 'Copyright (c) 2019-2025 Tomislav Bacinger' }")
