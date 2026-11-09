// Genera i color scheme M3 (light/dark) dal seed rosso racing #E10600 e verifica il contrasto WCAG AA.
import { argbFromHex, hexFromArgb, Hct, SchemeFidelity, SchemeNeutral, MaterialDynamicColors } from '@material/material-color-utilities'

const seed = Hct.fromInt(argbFromHex('#E10600'))
const roles = ['primary','onPrimary','primaryContainer','onPrimaryContainer','secondary','onSecondary','secondaryContainer','onSecondaryContainer','tertiary','onTertiary','tertiaryContainer','onTertiaryContainer','error','onError','errorContainer','onErrorContainer','background','onBackground','surface','onSurface','surfaceVariant','onSurfaceVariant','surfaceDim','surfaceBright','surfaceContainerLowest','surfaceContainerLow','surfaceContainer','surfaceContainerHigh','surfaceContainerHighest','outline','outlineVariant','inverseSurface','inverseOnSurface','inversePrimary','scrim','shadow']
const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
// Accenti dal seed rosso (Fidelity: primaryContainer = #E10600 esatto);
// superfici/neutri da una palette neutra fredda (hue del theme-color #0a0e14) per non tingere di rosso lo sfondo.
const coolSeed = Hct.fromInt(argbFromHex('#3a5578'))
const NEUTRAL = /^(on)?(background|surface|inverse|outline|scrim|shadow)/i
function scheme(dark) {
  const s = new SchemeFidelity(seed, dark, 0.0)
  const n = new SchemeNeutral(coolSeed, dark, 0.0)
  const out = {}
  for (const r of roles) { const c = MaterialDynamicColors[r]; if (!c) continue; const useN = NEUTRAL.test(r) && r !== 'inversePrimary'; out[r] = hexFromArgb(c.getArgb(useN ? n : s)) }
  return out
}
const lum = h => { const [r,g,b] = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4); return 0.2126*r+0.7152*g+0.0722*b }
const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05) }
const pairs = [['onPrimary','primary'],['onPrimaryContainer','primaryContainer'],['onSecondary','secondary'],['onSecondaryContainer','secondaryContainer'],['onTertiary','tertiary'],['onTertiaryContainer','tertiaryContainer'],['onError','error'],['onErrorContainer','errorContainer'],['onBackground','background'],['onSurface','surface'],['onSurfaceVariant','surface'],['onSurface','surfaceContainerLowest'],['onSurface','surfaceContainerLow'],['onSurface','surfaceContainer'],['onSurface','surfaceContainerHigh'],['onSurface','surfaceContainerHighest'],['onSurfaceVariant','surfaceContainer'],['onSurfaceVariant','surfaceContainerHigh'],['onSurfaceVariant','surfaceContainerHighest'],['onSurfaceVariant','surfaceContainerLow'],['onSurfaceVariant','surfaceVariant'],['inverseOnSurface','inverseSurface'],['primary','surface'],['primary','surfaceContainer'],['primary','surfaceContainerHigh'],['onSurface','surfaceDim'],['onSurface','surfaceBright'],['error','surface'],['tertiary','surface'],['secondary','surface'],['onSurface','background'],['primary','background']]
const light = scheme(false), dark = scheme(true)
// Tinte del brand: in light il primary resta il rosso racing più vicino possibile al seed
let checks = 0, pass = 0
for (const [n, s] of [['light', light], ['dark', dark]]) for (const [fg, bg] of pairs) { checks++; const r = ratio(s[fg], s[bg]); if (r >= 4.5) pass++; else console.error(`FAIL ${n} ${fg}/${bg} ${r.toFixed(2)}`) }
console.error(`WCAG AA: ${pass}/${checks}`)
const block = s => Object.entries(s).map(([k,v]) => `  --md-sys-color-${kebab(k)}: ${v};`).join('\n')
process.stdout.write(`/* Generato da scripts/gen-tokens.mjs — seed #E10600, SchemeFidelity + neutri freddi, WCAG AA ${pass}/${checks} */\n:root, [data-theme='dark'] {\n  color-scheme: dark;\n${block(dark)}\n}\n[data-theme='light'] {\n  color-scheme: light;\n${block(light)}\n}\n`)
