# F1 Hub

Hub per seguire la Formula 1 con **dati 100% reali, mai inventati**. Interfaccia in italiano (con inglese), tema scuro di default (con chiaro), design Material 3 Expressive con layer glass.

## Avvio

Requisiti: Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build (0 errori)
npm run preview
npm run lint     # oxlint
```

Nessun backend, nessun database, nessuna API key. Routing con `HashRouter`, quindi funziona da qualsiasi hosting statico. Deploy su Vercel con integrazione GitHub: ogni push su `main` crea un deployment di produzione.

## Pagine

| Route | Contenuto |
|---|---|
| `/` | Prossimo GP con countdown (o hero LIVE), top-5 piloti e costruttori, ultimo GP, ultime news, preferiti |
| `/calendario` | Filtri per mese, continente e stato; vincitore per i GP disputati |
| `/gara/:season/:round` | Info, Gara, Qualifiche, Sprint, Prove (best lap OpenF1), Classifiche dopo il GP |
| `/risultati` | Stagione / GP / sessione, con DNF/DNS/DSQ reali |
| `/piloti`, `/piloti/:driverId` | Lista per classifica; statistiche, grafico punti, gara per gara |
| `/team`, `/team/:constructorId` | Lista team; statistiche, piloti, punti per GP, gara per gara |
| `/circuiti` | Schede con tracciato, coordinate, vincitori recenti |
| `/classifiche` | Piloti e costruttori, 2014 → oggi |
| `/live` | Race Center: replay completo delle sessioni dal 2023 |
| `/news` | Aggregatore RSS per categoria |
| `/impostazioni` | Tema, lingua, stagione, unità, preferiti, auto-refresh, notifiche (solo UI), cache, fonti |

Ricerca globale con l'icona lente o **Ctrl+K**.

## Fonti dati

| Fonte | Uso |
|---|---|
| [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) | Fonte primaria: stagioni, calendario, classifiche, risultati, piloti, team, circuiti |
| [OpenF1](https://openf1.org) | Race Center e best lap delle prove (storico dal 2023). Il live richiede l'abbonamento a pagamento: sul piano gratuito l'app mostra lo stato `needsSubscription`, mai dati simulati |
| [f1api.dev](https://f1api.dev) | Solo arricchimento schede (sigla, nascita, numero, sede, prima stagione, titoli). In caso di conflitto vince Jolpica |
| [rss2json](https://rss2json.com) | News da Motorsport.com Italia e PitTalk: solo titolo, estratto breve, fonte, data e link |

Regola d'onestà: se un dato non esiste o una fonte non risponde, l'app mostra la cache o un messaggio di indisponibilità, e `n/d` dove il dato manca (es. curve e record sul giro dei circuiti).

## Immagini, tracciati e licenze

- **Tracciati**: geometrie da [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits), MIT License, Copyright (c) 2019-2025 Tomislav Bacinger (vedi `LICENSE-f1-circuits.md`). Repository non ufficiale, non affiliato alle società della Formula 1. La lunghezza del circuito mostrata viene dallo stesso dataset. Generati con `scripts/build-tracks.py`.
- **Foto piloti e loghi team**: risoluzione a 3 livelli in `src/api/photos.ts`: (1) mappa curata `src/data/assets.ts`, (2) immagine infobox dell'articolo Wikipedia accettata **solo se ospitata su Wikimedia Commons** (Commons ospita esclusivamente file con licenza libera; i file locali non liberi di en.wikipedia vengono scartati), (3) placeholder. La mappa curata è vuota in questa versione: vanno aggiunti solo file con licenza verificata singolarmente.
- **Foto monoposto**: solo dalla mappa curata per stagione esatta; altrimenti un fallback grafico in tinta team (non spacciato per foto).
- **Bandiere**: [flag-icons](https://github.com/lipis/flag-icons), MIT (`src/assets/flags/LICENSE-flag-icons`).
- **Icone**: [Material Symbols](https://fonts.google.com/icons), Apache License 2.0, SVG inline in `src/design/icons.tsx`.
- **Team radio**: audio MP3 dalla CDN ufficiale F1 via OpenF1, con attribuzione "Audio: Formula 1 / OpenF1".
- Le foto ufficiali dei piloti (`headshot_url` di OpenF1) **non** vengono usate: sono asset proprietari.

F1®, FORMULA 1 e marchi correlati appartengono a Formula One Licensing B.V. App non ufficiale, a scopo informativo.

## Design system

Token Material 3 generati dal seed rosso racing `#E10600` con `@material/material-color-utilities` (`scripts/gen-tokens.mjs`): accenti dallo schema Fidelity, neutri freddi per le superfici; 64/64 coppie di testo verificate WCAG AA. Typescale completa, shape espressive, elevation 0–5, state layer, motion, layer glass (`src/design/glass.css`). `prefers-reduced-motion` rispettato.

## Non implementato (di proposito)

Notifiche push reali (serve un backend), dati circuito estesi (curve, record), telemetria live sul piano gratuito, confronto testa a testa tra piloti su stagione, PWA/offline completo.
