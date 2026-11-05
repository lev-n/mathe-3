# Mathe 3

**Mathe üben für die 3. Klasse – kostenlos, ohne Anmeldung, ohne Werbung, ohne Tracking.**

An interactive maths practice portal for 3rd-grade students (Klasse 3, Grundschule, ages 8–9) in Germany. All student-facing text is German. The design is grounded in the research summarised in [`docs/research.md`](docs/research.md): learning science at this age, ethical motivation design, the Lehrpläne of Bayern, NRW, Baden-Württemberg, Sachsen and Berlin-Brandenburg, DSGVO/TDDDG, and WCAG 2.2.

- **Site:** https://mathe-3.web.app (Firebase project `mathe-3`)
- **Status:** the content has been checked by automated tests and AI review, not by teachers. The operator details for Impressum and Datenschutz are still pending (see below).
- **Stack:** Vite + React + TypeScript (strict), Vitest; no runtime dependencies besides React and self-hosted fonts.
- **Design:** Material Design 3 (tonal colour roles, shape scale, elevation and state layers in `src/styles/tokens.css`), with the readability rules below kept intact: large type (21 px body), 52/68 px targets and contrast-tested tokens.

---

## What children can practise

7 topics with 61 skills, 6 of them optional extras. Every skill has three levels (**Stufe 1–3**, roughly Anforderungsbereich I–III). Exercises are generated from a seed, so they rarely repeat. Numbers and results stay at or below 1000. The exceptions are unit conversions in Größen and their stories (2500 m, 9 km = 9000 m).

| Topic | Skills (*extras in italics*) |
|---|---|
| **Zahlen bis 1000** | Hunderter bündeln, Hunderter, Zehner, Einer, Zahlen lesen und hören, Zählen in Schritten, Nachbarzahlen, Größer oder kleiner, Zahlenstrahl bis 1000, Runden, *Tausenderbuch* |
| **Kopfrechnen und Einmaleins** | Kleine und große Aufgabe, Plus und Minus bis 1000, Bis zum Hunderter und bis 1000, Einmaleins sicher, Geteiltaufgaben sicher, Mal und geteilt mit Zehnerzahlen, Malnehmen und Teilen in Schritten, Teilen mit Rest, *Mal zuerst* |
| **Schriftlich rechnen** | Richtig untereinander, Plus ohne Übertrag, Plus mit Übertrag, Minus ohne Übertrag, Minus mit Übertrag, Minus mit Null, Überschlagen und prüfen, Im Kopf oder schriftlich?, *Mal schriftlich* |
| **Geld, Längen, Zeit, Gewicht** | Euro und Cent mit Komma, Einkaufen und Rückgeld, Millimeter, Zentimeter, Meter, Kilometer, Uhrzeit auf die Minute, Wie lange dauert das?, Gramm und Kilogramm, Was passt?, *Liter und Milliliter* |
| **Geometrie** | Figuren und rechte Winkel, *Parallel und senkrecht*, Körper, Würfelgebäude, Würfelnetze, Spiegeln, Flächen auslegen, Einmal außen herum, Bandornamente |
| **Daten und Zufall** | Tabellen lesen, Strichliste, Tabelle, Diagramm, Säulen und Balken, Fahrplan und Preisliste, Wie viele Möglichkeiten?, Sicher, möglich, unmöglich, Wo sind die Chancen größer? |
| **Sachaufgaben** | Welche Rechnung passt?, Geschichten mit einer Rechnung, Wie viel mehr? Wievielmal?, Was bedeutet der Rest?, Geschichten mit Größen, Zwei Schritte, Je mehr, desto mehr, Passt das?, *Genau oder ungefähr?* |

Written division, the Tausender place beyond 1000, comma notation in written calculation, area formulas and numeric probabilities are out of scope (`docs/research.md` §2.4).

## How it works (pedagogy in one minute)

- **Feedback, never just "falsch":** first wrong answer → a targeted hint (from a library of typical errors, e.g. a forgotten Übertrag or a number written as spoken, 90051 for 951), then a second try. Second wrong answer → worked solution with the child's own numbers, then a similar task (*Zwillingsaufgabe*) later in the round. Once a Stufe is *Sicher*, a correct answer gets only a short "Richtig!".
- **Worked examples:** "So geht's" on demand and after repeated difficulty; a new Stufe opens directly on its first task.
- **Rounds:** 10 items, 8 in `schriftlich`, with a fixed mix of AB I, II and III per Stufe (10 items: 6/3/1, 4/4/2, 2/5/3; 8 items: 5/2/1, 3/3/2, 2/4/2), easier ones first.
- **Mastery:** per skill and Stufe: *Geübt* (★) → *Sicher* (★★: 8 of the last 10 correct on the first try, including the last 3) → *Gemeistert* (★★★: confirmed by spaced reviews ≥ 3 days later). Nothing is locked; the app only suggests.
- **Spaced review:** Leitner boxes (1, 3, 7, 14, 28 days) → "Heute wiederholen" (3 items in a warm-up, at most 6 a day). All 100 Mal facts and 90 Geteilt facts have their own box, never as rows and never against a clock; a fact review runs `kopfrechnen.einmaleins` or `kopfrechnen.umkehren` and counts for the fact, not for a Stufe.
- **Subtraction method:** Abziehen or Ergänzen, asked once before the first minus skill, default Abziehen, never mixed. Every minus generator follows the setting (visual, Sprechweise and bug library).
- **Motivation without manipulation:** stars for mastery, competence badges (surprises, not announced), improvement badges that reward getting better than one's own earlier self (an error that no longer happens, a hard start followed by three blocks of 10 answers in a row on later days, each with at least 8 first try, a once-missed task solved in a review days later; shown only after practice in the round summary or on the goodbye screen, never mid-round, and they need evidence from a later day or a scheduled review, so wrong answers alone never earn them; see `docs/research.md` M16), a gentle weekly goal ("Übungstage diese Woche"), an in-round "5 richtig hintereinander!". **No** consecutive-day streaks (loss aversion), leaderboards, currencies, timers, sounds, pop-ups or guilt-tripping.
- **Reading support:** short sentences (`docs/research.md` §4, checked by tests on generated text), and *Vorlesen* with local German voices only, which never plays by itself.
- **Worksheets:** printable sheets for teachers and parents (topic, skills, Stufe, 6/10/15 tasks), reproducible by sheet number, with an answer key on a separate page.

## Privacy (DSGVO) and accessibility

- No accounts, no cookies, no analytics, no ads, **no third-party requests**. Fonts (Atkinson Hyperlegible Next/Mono, Andika) are bundled. `scripts/check-dist.mjs` fails the build if the bundle references a third-party host or contains inline scripts.
- Progress is kept in memory until the child or an adult agrees ("Soll ich mir deinen Fortschritt auf diesem Gerät merken?"). Only then is it written to `localStorage` key `mathe3.v1` (aggregate progress + settings, no names). Adults can export, import or delete it on the page "Für Erwachsene" (`/erwachsene`).
- Strict security headers and CSP in `firebase.json`.
- WCAG 2.2 AA targets: contrast-tested colour tokens, touch targets ≥ 52 px (keypad, answer controls and Prüfen ≥ 68 px, written cells ≥ 56 px), tap only with no dragging, full keyboard support, screen-reader text for every task, an on-screen Ziffernblock that is on by default on every device, settings for larger text, more spacing, school font and no animation.
- Keyboard-only practice: every new task focuses its first answer field. Enter moves to the next empty field, then checks; Shift+Enter goes back. After a wrong answer the first wrong field is focused with its content selected. The Ziffernblock's "Prüfen" does the same as Enter. All of this lives in one shared helper, `src/ui/answers/fieldNav.ts`.

> **Before going public:** fill in the operator details in [`src/config/operator.ts`](src/config/operator.ts). The Impressum (§ 5 DDG) and Datenschutzerklärung (Art. 13 DSGVO) show a marked placeholder until then, the build prints a warning, and `npm run deploy` (as well as a plain `firebase deploy`, via the `predeploy` hook in `firebase.json`) refuses to deploy (`npm run check:operator`). Only for a private preview that is not shared publicly can `ALLOW_MISSING_OPERATOR=1` turn this into a warning. The legal texts are a careful starting point, not legal advice.

## Search engines and link previews

- **Prerendered pages.** `npm run build` renders every page that has content for a first visitor to static HTML: the start page, the seven topic pages, Arbeitsblätter, Für Erwachsene, Datenschutz and Impressum (`src/seo/prerender.tsx`, written to `dist/` by `scripts/prerender.mjs`). Crawlers that do not run JavaScript (most AI crawlers, link previews in messengers) see the real content, and every visitor gets a first paint without waiting for the script. The browser then hydrates the page; progress stored on the device appears right after. `src/seo/hydrate.test.tsx` fails if a prerendered page no longer matches the browser's first render.
- **Per-page metadata** (`src/seo/meta.ts`, one source for the build and for client-side navigation): a unique title and description, a self-referencing canonical link (so `mathe-3.firebaseapp.com` and other duplicates point to `mathe-3.web.app`), Open Graph / X card tags with `public/og-image.png`, and schema.org JSON-LD (`src/seo/structuredData.ts`): `WebSite` for the site name, `LearningResource` and `BreadcrumbList` for the topic pages and the worksheets.
- **What gets indexed.** The start page, the topic pages, the worksheets and the page for adults, all listed in `sitemap.xml`. Practice rounds (random tasks), Mein Fortschritt and Abzeichen (personal), Datenschutz, Impressum and "not found" carry `noindex`.
- **Status codes.** Firebase serves practice rounds and the personal pages from a noindex app shell (`app.html`) and every unknown path from `404.html` with HTTP status 404, so there are no "soft 404s". `src/seo/prerender.test.ts` checks that `firebase.json` covers every route.
- **robots.txt** allows all crawlers, including AI search crawlers, and points to the sitemap. Noindex pages stay crawlable, so search engines can see the tag.
- **Search consoles:** submit `https://mathe-3.web.app/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Run, test, build

Requirements: Node.js 22.22+, 24.15+ or 26+ (developed and tested in CI with Node 26), npm.

```bash
npm install          # install dependencies
npm run dev          # start the dev server → http://localhost:5173
npm test             # run all unit/integration tests once (Vitest)
npm run test:watch   # tests in watch mode
npm run typecheck    # TypeScript (strict), no emit
npm run build        # typecheck + production build + prerendered pages to dist/ + privacy/budget check (+ operator-data warning)
npm run preview      # serve the production build locally
```

The tests cover every exercise generator (a shared invariant suite in `src/core/testing.ts` runs many seeds per skill × Stufe: answers recomputed, worked steps present, hints never reveal the answer, typical-error hints trigger, German notation, text rules, banned phrases, determinism, variety), the answer parser and checker, the progress/mastery/review logic, all UI components (jsdom), and an integration suite that renders every skill in every input mode.

## Deploy to Firebase Hosting

The project is configured for the Firebase project **`mathe-3`** (`.firebaserc`), serving `dist/` with the prerendered pages, rewrites for the client-only routes, a real 404 and security headers (`firebase.json`).

```bash
npm install -g firebase-tools   # once
firebase login                  # once
npm run deploy                  # = operator-data check && npm test && npm run build && firebase deploy --only hosting
```

The site is then live at https://mathe-3.web.app (and https://mathe-3.firebaseapp.com). To deploy to another project: `firebase use --add` or edit `.firebaserc`, and set the public address in [`src/config/site.ts`](src/config/site.ts) (canonical links, sitemap, link previews).

## Project structure

```
docs/research.md          research summary with sources and the finding → design mapping
src/core/                 contracts (types.ts), age rules, seeded RNG, German formatting, parsing, checking, text rules, test suite
src/data/curriculum.ts    curriculum tags + alignment of the Länder
src/topics/<topic>/       one file per skill (pure generator) + tests; registry.ts lazy-loads topics
src/state/                progress store (opt-in storage), mastery, Leitner review, badges, improvement detection (growth.ts), round builder
src/ui/practice/          practice round: hints, feedback, worked solutions, summary, Vorlesen
src/ui/answers/           answer inputs (number, choice, multi, order, written, cells grid, number line)
src/ui/visuals/           hand-written SVG visuals (Rechenmaterial, Zahlenstrahl, Schriftlich, Uhr, Geld, Lineal, Diagramme, Körper …)
src/ui/keypad/            on-screen Ziffernblock
src/ui/pages/, src/ui/app/ pages, router, layout, worksheet mode, settings
src/seo/                  search metadata, structured data, build-time prerendering (+ hydration tests)
src/config/operator.ts    Impressum/Datenschutz operator details (fill in before going public)
src/config/site.ts        public address of the site (canonical links, sitemap, link previews)
scripts/prerender.mjs     writes the prerendered pages, 404.html, app shell, sitemap.xml and robots.txt
scripts/check-dist.mjs    build guard: no third-party hosts, no inline scripts or styles, bundle budget
```

### Adding a skill

1. Create `src/topics/<topic>/<slug>.ts` exporting a `SkillDef` (id `<topic>.<slug>`, never renamed later because progress is stored by id) whose `generate(rng, stufe, ctx)` returns an `Exercise` (see `src/core/types.ts`). Use only `rng` for randomness and `fmt`/`fmtMoney`/… for numbers.
2. Add it to the topic's `index.ts`.
3. Add `<slug>.test.ts` with `describeSkill(skill)` plus skill-specific checks.

## Why React (and not vanilla)?

The app has many interactive components (a number-line slider, toggle grids, keypad, worksheet renderer) and a stateful practice flow. React's component model keeps these consistent and testable, and lets the generators stay pure data that the same components render on screen and on paper. The cost is small: the initial JS stays under the 150 KiB gzip budget that `scripts/check-dist.mjs` enforces, and every topic is lazily loaded.

## Limitations

- Content was checked by automated tests and AI review, not by teachers and not with children. A pilot with a few children is the best next step (see `docs/research.md` §8).
- Most Länder fix only the end of Klasse 4; only Sachsen has a binding Klassenstufe 3 (`docs/research.md` §2.1). What only a minority of the sources place in Klasse 3 is an optional extra (Tausenderbuch, Mal schriftlich, Mal zuerst, Liter und Milliliter, Parallel und senkrecht, Genau oder ungefähr?), labelled "Extra" and on by default. Extras never count toward topic progress or badges.
- The operator details in `src/config/operator.ts` are empty, so Impressum and Datenschutz show a placeholder and a public deployment is blocked until they are filled in.
- Progress lives on one device and belongs to one child: Mathe 3 does not tell children apart, so siblings sharing a browser share one record. Use "Fortschritt sichern/laden" to move it between devices.

## Contributing

Bug reports and pull requests are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md). For security issues, see [`SECURITY.md`](SECURITY.md).

## License

Copyright (C) 2026 lev-n

Mathe 3 is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version (SPDX: `AGPL-3.0-or-later`). It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [`LICENSE`](LICENSE) for the full text.

The same license covers the source code, the documentation (including [`docs/research.md`](docs/research.md)) and the German exercise, hint and solution texts in `src/`.

If you run a modified version on a server that others use, the AGPL requires you to offer them the source code of your version (§ 13).

Third-party components keep their own licenses: React (MIT) and the self-hosted fonts Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono and Andika (SIL Open Font License 1.1). See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
