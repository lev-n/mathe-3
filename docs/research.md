# Research summary: Mathe-Portal Klasse 3 ("Mathe 3")

| | |
|---|---|
| **Project** | Free, no-login maths practice portal for Klasse 3 (Grundschule, Germany, children aged 8–9). Sibling of the Klasse 2 and Klasse 4 portals. Static site, progress only in the browser. |
| **Research date** | 2026-11-03 |
| **Language** | English. German curriculum terms and all child-facing strings stay German. |
| **Status** | Basis for implementation. No expert in Fachdidaktik or law has reviewed it. Not legal advice. |
| **Relation to Klasse 2 and 4** | The Klasse 4 research [45] stays valid for general learning science, motivation, privacy and accessibility. IDs such as L8, M16, C3 or P13 mean the findings in [45]. IDs F1–F18 mean the findings in the Klasse 2 research [46]. G1–G18 are new here. This document adds only what changes at age 8–9. |

Evidence labels: **N** normative (curriculum, law), **E** empirical, **D** didactic consensus or practitioner material, **H** our own heuristic. Inline numbers refer to section 9. Curriculum wording was read in the original texts unless section 8 says otherwise. Effect sizes come from the primary source unless the text says otherwise.

## 1. Key takeaways

1. **Most Länder do not define "Klasse 3" in their plan.** Bayern [2], NRW [6] and Baden-Württemberg [8] set expectations for the end of Klasse 4 only. Of the plans read, only Sachsen has a binding Klassenstufe 3 [9]. Berlin-Brandenburg has an official planning aid for Jahrgangsstufe 3 [13]. All other placement in this document comes from textbooks and school plans, and it says so.
2. **The number range is 0–1000.** This is explicit in Sachsen [9] and in the LISUM aid [13], and consistent with the Bayern workbook [5], school and PIKAS material from NRW [16][18], and a study that describes the German curriculum this way [23].
3. **Written addition and subtraction start in Klasse 3, in every source that places them** [5][9][13][14][15]. **Written multiplication in Klasse 3 is Sachsen only** (3-digit · 1-digit) [9]. **Written division appears in no Klasse-3 source** we read. So `schriftlich` is + and −, with · as `opt`, and no ÷.
4. **The subtraction method differs by Land.** Bayern prescribes the Abziehverfahren [2]. BW allows "Abziehen oder Ergänzen" [8]. NRW names no method [6]. The LISUM aid says both need not be taught [13]. Sachsen's plan describes "Entbündeln im Minuenden" without naming the method [9]. The app needs a setting, default Abziehen, never mixed within a session (C7).
5. **The whole kleines Einmaleins is now the target.** Sachsen requires "automatisiertes Lösen" in Klasse 3 [9], and LISUM plans it in Jg. 3 [13]. NRW and Bayern set it for the end of 3/4 [2][6]. Track all 100 · facts and 90 : facts, never as rows and never against a clock.
6. **Division with Rest is core.** Sachsen writes "14 : 3 = 4 Rest 2" in Klasse 3 [9]. The Bayern workbook and the Klett BE/BB plan both have it in Klasse 3 [5][14]. The notation is disputed [13], so the app uses two fields and a Probe.
7. **New units: km, mm, g, kg, s, and the comma with € and m.** Litres and millilitres are not placed in Klasse 3 by any source read, so they are `opt` (section 2.2).
8. **The signature error moves from inversion to place-value syntax.** In 131 German third graders, pure inversion made up 6.1 % of syntactical number-writing errors; most were errors integrating hundreds or thousands, such as 90051 for 951 [23]. Hints should change accordingly.
9. **Größen are weak and worth the space.** In VERA-3 Sachsen-Anhalt 2024/25, 39.84 % of third graders were below the Klasse-4 Mindeststandard in Größen und Messen, and 46.36 % on the global scale [25]. Those are end-of-Klasse-4 standards measured in Klasse 3, so they do not describe failure at Klasse-3 level.
10. **Recommended default round: 10 items, 8 in `schriftlich`.** This is a heuristic (section 7.3). No timed mode in v1. No new visual is required; five existing visuals need extensions (section 6).
11. **Fair-design rules do not change.** No timers, currency, leaderboards or streaks. Section 7.2 ("Banned patterns") replaces Klasse 4 §6.4, and section 7.4 restates M15.

## 2. Curriculum comparison: what is expected in Klasse 3

### 2.1 What the plans say about Klasse 3

The KMK Bildungsstandards 2022 describe **Regelstandards for the end of Jahrgangsstufe 4** [1]. They set no Klasse-3 waypoint. VERA-3 tests these end-of-Klasse-4 standards in Klasse 3, and it aims for average solution rates of about 50–60 % for that reason [25].

| Land | Document read | What it fixes for Klasse 3 |
|---|---|---|
| **Bayern** | LehrplanPLUS, Fachlehrplan 3/4 [2]; "Grundlegende Kompetenzen zum Ende der Jahrgangsstufe 4", filed under Jgst. 3, 4 [3] | **Nothing separately.** The page text contains no sentence that splits Jgst. 3 from Jgst. 4, and the range is "bis zur Million". Our only Jgst. 3 evidence is a 2015 Cornelsen teacher manual written to this plan [5]. |
| **NRW** | Lehrplan 2021, "Ende der Klasse 4" [6, pp. 85–94] | **Nothing separately.** The plan says that on school level "die curricularen Vorgaben in schulinternen Arbeitsplänen konkretisiert werden" [6, foreword]. Competences not split by column must be reached by the end of the Schuleingangsphase and are "im Unterricht der Klassen 3 und 4 vertieft und abgesichert" [6, p. 85]. |
| **Baden-Württemberg** | Bildungsplan 2016 **V2**, Klassen 3/4, sections 3.2.1.1–3.2.4.2 [8]; implementation table [7] | **Nothing separately.** For 2026/27 V2 (29.02.2024) applies to all four Klassen [7]. Older 2016 pages are still online, so use the `M.V2` pages. |
| **Sachsen** | Lehrplan Grundschule Mathematik, in force 1 August 2025 [9]; older comparison Kl. 3/4 from the 2019 plan [10]; Klett synopsis [11] | **A binding Klassenstufe 3 with its own Lernbereiche.** This is our strongest Klasse-3 source. |
| **Berlin-Brandenburg** | Rahmenlehrplan Teil C [12]; LISUM Planungshilfe Jg. 3 (2024) [13] | The plan gives Niveaustufen (Jg. 3–4: Niveau C, in Berlin in parts D). The aid is an official suggested year plan, not binding. |

Other placement sources, weaker: Klett Nussknacker plan for BE/BB/HB/MV [14]; an undated Westermann plan for BW that uses older "Leitidee" wording and probably predates 2016 [15]; a jahrgangsgemischt 3/4 plan from a school in NRW [16]; PIKAS and SchuMaS material filed under Klasse 3 [17][18][19].

### 2.2 Content by area

| Area | Bayern (plan 3/4 [2]; Jgst. 3 only via workbook [5]) | NRW (end of Kl. 4 [6]; Kl. 3 via [16][17][18]) | BW V2 3/4 [8] | Sachsen, Klassenstufe 3 [9] | BE-BB Jg. 3 [12][13][14] | Decision for Mathe 3 |
|---|---|---|---|---|---|---|
| **Number range** | Plan: "bis zur Million"; 734 → 7H 3Z 4E; Hunderterplatten; Teiler, Vielfache. Workbook: end-of-year check uses 0–1000 | Plan: bis 1.000.000. PIKAS: "Zahlraum bis 1000" in folder `klasse3`. School plan: 10er-, 100er-, 1000er-Schritte, Tausenderfeld, Tausenderbuch | Plan: bis 1.000.000; "Mehrsystemblöcke"; "besondere Bedeutung der Ziffer 0" | **"Zahlenraum bis 1 000"**; 348 → 3 H 4 Z 8 E; Stellenwerttafel T, H, Z, E; Nachbarzehner und -hunderter; **Runden** with Rundungsregel | "Erste Orientierung im Tausenderraum"; Zahlenstrahl bis 1000 | 0–1000. 1000 is the top value, so a result may be exactly 1000 but never above. Größen may convert past it (2500 m). |
| **Plus/Minus im Kopf, halbschriftlich** | Transfer 12 + 3 → 120 + 30; "im Kopf, halbschriftlich, schriftlich" | Zahlenrechnen "mündlich oder halbschriftlich", all four operations | Before written methods give "dem halbschriftlichen Rechnen ausreichend Raum" | Strategies, Umkehroperation; "Vermeiden jeder zu schnellen Normierung" | Schrittweise, stellenweise, Hilfsaufgabe, Ergänzen; Rechenstrich | Core, and taught before written methods. |
| **Written + and −** | Plan: "automatisiert"; Subtraktion "(Abziehverfahren)". Workbook: both in Jgst. 3, up to 3-digit | Plan: "sicher aus" by end of Kl. 4; no method. SchuMaS: Addition Kl. 3 | Plan: "Abziehen oder Ergänzen"; describe the algorithm. Old plan [15]: both in Kl. 3 | **"Kennen"**: Addition, up to three Summanden; Subtraktion, one Subtrahend; both "auch mit Übertrag" | Both in Jg. 3, late in the year; one method suffices | Core. See 2.3. |
| **Written ·** | Plan: 1- and 2-digit Multiplikatoren. Workbook: not in Jgst. 3 (text search) | "sicher aus" by end of Kl. 4 | Plan 3/4; old plan [15]: halbschriftlich only in Kl. 3 | **"Kennen": 3-digit · 1-digit** | Halbschriftlich in Jg. 3 [13][14] | `opt`. Only Sachsen. |
| **Written :** | Plan: Divisoren bis 10, auch mit Rest. Workbook: not in Jgst. 3 | Only "erläutern", einstellig, Restschreibweise | Plan 3/4 | Not in Kl. 3; Kl. 4 "Einblick gewinnen" | Halbschriftlich in Jg. 3 | **Out.** Halbschriftlich dividing only. |
| **Einmaleins** | "automatisiert und flexibel" with Umkehrungen by end of 3/4. Workbook: "Kannst du das Einmaleins?" at end of Jgst. 3 | "alle Zahlensätze … automatisiert" by end of Kl. 4 | "aus dem Gedächtnis abrufen" | **"Beherrschen … automatisiertes Lösen"** in Kl. 3 | "Automatisieren der Einmaleins-Aufgaben und Einsdurcheins-Aufgaben" | All 100 + 90 facts tracked, spaced. Target by end of year. Nothing locked. |
| **Zehnereinmaleins** | 6 · 4 → 60 · 4 | Erweiterter Zahlenraum | "analoge Aufgaben" | "Multiplikation mit Vielfachen von 10" | "Zehnereinmaleins", halbschriftlich, Zerlegen | Core. Product ≤ 1000. |
| **Division mit Rest** | 1/2 already "auch mit Rest" [4]. Workbook: "Teilen mit Rest" at end of Jgst. 3 | "Restschreibweise" only for written division | "Division mit Rest" | **"14 : 3 = 4 Rest 2"; "Klärung des Restes am konkreten Sachverhalt"** | Klett: "Dividieren mit und ohne Rest". LISUM warns about the "=" notation | Core. Two fields and a Probe (G6). |
| **Punkt vor Strich** | Not named | Not named | Not named | **"Vorrangregel"** in Kl. 3 | Terme "mit mehreren Rechenoperationen": 5 + 4 · 3 < 7 · 3 | `opt`. |
| **Geld, Komma** | "Euro und Cent auch mit dem … üblichen Komma". Workbook: 59,95 € | "rechnen mit Größen (auch mit Dezimalzahlen)" | Unterschiedliche Schreibweisen | Rechnen mit Geldbeträgen in Sachsituationen; 2019 plan: "Kommaangaben" [10] | **"Kommaschreibweise von Geldbeträgen (42,03 €…)"** with a warning on the 10-Cent-Spalte | Core. Always two decimals. |
| **Längen** | km, mm; comma with m and cm. Workbook: 1000 mm; 1,20 m; 1,7 km | mm, km; Stützpunkt 1 km | km, m, cm, mm | Kilometer; mit zwei Einheiten; **in Kommaschreibweise**; ½ cm, ½ m, ½ km | km (Erlaufen eines Kilometers), mm; also dm in the plan | km, m, cm, mm. Comma with m on Stufe 2–3, with km on Stufe 3 only. No dm. |
| **Zeit** | s; "1 h 25 min". Workbook: 13.50 Uhr + 45 min; Sekunden, Minuten, Stunden | Sekunde; analog and digital | h, min, s | **Minutengenauigkeit**; Sekunde; ¼ h, ½ h, ¾ h; Zeitpunkt, Zeitspanne | Sekunde; Zeitspannen | Minute-exact is core. Seconds on Stufe 3 only. Never "1,5 h". |
| **Gewicht** | kg, g; Workbook: yes | g, kg, t; Stützpunkte 1 g, 500 g, 1 kg | t, kg, g; 1 kg – Päckchen Mehl | **"Kennen": g, kg; ½ kg**; Packung Mehl | kg, g in Jg. 3 | g and kg are core. **t out** (Sachsen Kl. 4). |
| **Hohlmaße** | l, ml in 3/4; workbook text has no ml | ml, l | l, ml | **Not in Kl. 3 in 2025**, Kl. 4. The 2019 plan had "Einblick" in Kl. 3 [10] | Listed in the plan; no teaching unit found in the aid | `opt`. |
| **Fläche, Umfang** | Already in 1/2 by K2 [46]. Workbook: "Am Geobrett: Flächen, Umfang, Achsensymmetrie" | Kl. 4: Auslegen, Einheitsquadrate | Handelnd; "Auslegen"; "gegebenenfalls auch rechnerisch" | **"Einblick gewinnen"**; Auszählen, Faden, Fachbegriffe | Plan Niveau C: counting units. Not found in the aid | Core on a grid, in Kästchen. No formula, no cm². Two skills, mixed only on Stufe 3 (G9). |
| **Symmetrie** | Symmetrieachse, deckungsgleich, Spiegelbild | Fertigen auf Gitterpapier | Vervollständigen, Spiegelachse | Bandornamente: Achsen-, Schiebe-, Drehsymmetrie | Achsensymmetrische Figuren | Core, axial only. Drehsymmetrie out. |
| **Körper** | Würfel, Quader compared; Workbook: Pyramide, Zylinder | u. a. Pyramide, Zylinder | Quader, Würfel, Kugel, Zylinder | **Pyramide, Kegel, Zylinder**, Spitze | Geometrische Körper herstellen | Core. |
| **Netze** | Würfelnetze, Quadernetze. Workbook: Würfelnetz | "u. a. Würfelnetze" | Quader- und Würfelnetze | **Würfel- und Quadernetze** | Quader- und Würfelnetze | Core; Quadernetze on Stufe 3. |
| **Linien, Winkel** | "rechter Winkel" | Senkrecht, waagerecht, parallel, rechter Winkel | Parallel, senkrecht | **Parallel, senkrecht; Parallelogramm** | Parallelen, Senkrechte; Parallelogramm, Raute | Rechter Winkel is core. Parallel, senkrecht: `opt`. Parallelogramm: Stufe 3. Drawing out (touch). |
| **Daten** | Balkendiagramm; Fahrpläne, Preislisten; derive hidden data | Diagramme, Tabellen, Kalender | Balken- oder Säulendiagramm | **Säulen- and Balkendiagramme; Werte aus einem Fahrplan** | Säulendiagramm, skalierte Achse (start of year) | Read and complete; never free-form. |
| **Zufall, Kombinatorik** | Glücksrad, Würfel; Kugeln im Säckchen; 3 T-Shirts, 3 Hosen, 2 Paar Socken; Baumdiagramm. Workbook: T-Shirt-Kombinationen | "sicher, (un-)wahrscheinlich, (un-)möglich"; "zunehmend systematischer" | "ist wahrscheinlicher als"; sicher, möglich, unmöglich | Urne, Glücksrad, Würfel; order events on a **Wahrscheinlichkeitsstreifen**; wahrscheinlich, unwahrscheinlich; Tachometerprinzip | Glücksrad, Urnen; absolute Häufigkeit; Gewinnchancen | Core: three words, compare chances by counts. Standalone "wahrscheinlich" on Stufe 3 only (C10). No numbers as probabilities. |
| **Sachaufgaben** | Mehrschrittig; Fermi; "je mehr – desto mehr/weniger"; exact or Überschlag | Skizzen, Tabellen; Näherungswerte | Proportionalität einfach; Knobelaufgaben; Fermi | Lösungsansätze, Skizzen; einfache funktionale Beziehungen in Tabellen | Heuristische Hilfsmittel | One and two steps are core. Fermi `opt`. |

### 2.3 Länder differences that affect the app

**Written algorithms in Klasse 3**

| Source | Addition | Subtraktion | Method | Multiplikation | Division | Strength |
|---|---|---|---|---|---|---|
| Sachsen 2025 [9] | Yes; ≤ 3 Summanden, Übertrag | Yes; one Subtrahend, Übertrag | "Entbündeln im Minuenden"; the 2019 plan said "Abziehverfahren" [10] | **Yes**, 3-digit · 1-digit | No (Kl. 4 "Einblick") | N, binding for Kl. 3 |
| BE-BB, LISUM Jg. 3 [13] | Yes, late in the year | Yes | Both shown, "Es müssen nicht unbedingt beide Verfahren … thematisiert werden" | No; halbschriftlich | No; halbschriftlich | N (non-binding aid) |
| BE/BB/HB/MV, Klett [14] | Yes | Yes | Not read in detail | No; halbschriftlich | No | D, textbook |
| Bayern, Zahlenzauber [5] | Yes, 3-digit | Yes | **Abziehverfahren** (plan [2]), notation with a Strich instead of crossing out | Not found | Not found | D, one textbook (2015) |
| BW, Westermann [15] | Yes | Yes | "Abziehverfahren oder Ergänzungsverfahren" | No; halbschriftlich | No; halbschriftlich, Rest | D, old plan |
| NRW [6][16][17] | Addition labelled Kl. 3 in SchuMaS | Not separately placed | **None prescribed** | Not placed | Not placed | Weak; school plan is mixed-age |

**Other differences**

- **Reading the plan names.** Bayern requires the Fachbegriffe addieren, subtrahieren, multiplizieren, dividieren, Summe and Differenz by end of 3/4 [2]. NRW adds Produkt and Quotient by end of Kl. 4 [6]. The 2019 Sachsen comparison lists Dividend, Divisor, Quotient in Kl. 3 [10]. Prompts stay with plus, minus, mal, geteilt; other terms appear only in a skill's definition card.
- **Runden.** Explicit in Sachsen Kl. 3 [9] and NRW by Kl. 4 [6]. BW says "Runden, Überschlag" [8]. Bayern names only Überschlag [2] (4.15 in [45]).
- **Teilbarkeitsregeln and Quersumme.** Sachsen only, Kl. 3 [9]. Out of scope.
- **Bandornamente with Dreh- and Schiebesymmetrie.** Sachsen's vocabulary (gespiegelt, gedreht, verschoben) [9]. We use the pictures, without naming the types.
- **Wahrscheinlichkeitsstreifen.** Sachsen only. `order` on Stufe 3 covers the idea.
- **Timing within the year.** Written methods sit late in the year in LISUM, around the middle in Westermann BW and Zahlenzauber Bayern [5][13][15]. A child in October may not have met them. Nothing is hard-locked, and the suggestion for `schriftlich` should not appear first.

### 2.4 Out of scope

Numbers above 1000 except unit conversions; Stellenwerte above T; written division; written multiplication beyond `opt`; written calculation with comma numbers (the old BW plan has it, others do not place it [15]); dm, t, hl, cm², m², Datenmengen; Binärzahlen (NRW, Kl. 4 [6]); area formula; Maßstab; Teilbarkeitsregeln, Quersumme; Drehsymmetrie; Trapez; numeric probabilities; Klammern; fractions beyond ½, ¼, ¾ with a quantity.

## 3. Learning science and age-specific findings

General findings carry over from [45] (L1 retrieval, L2 spacing, L3 interleaving, L4 elaborated feedback, L6 worked examples, M1, M2, M6) and from [46] (F1 counting, F6 equal sign, F11 read-aloud, F12 pictures). Most of the evidence comes from older learners, and the elementary estimate for quizzing is smaller and uncertain [53].

| ID | Finding | Evidence | Design consequence |
|---|---|---|---|
| G1 | **Number writing at the start of Klasse 3.** 131 German third graders (mean age 104.3 months, tested in the first 3 months of the year) wrote 28 spoken numbers up to 10,000. Most errors were syntactical, such as 90051 for 951 or 10002 for 1002. Pure inversion made up 6.1 % of syntactical errors (Grade 2: 10.7 %), and the inversion rate was one sixth of Grade 2's. Place-value level explained syntax errors better than inversion errors. The paper treats grade as an effect of instruction. Three schools only [23]. | E | `zahlen.zahlwort` tests zeros and "written as spoken". Bug `zahlwort-anhaengen` comes first; `zahlendreher` stays, but is no longer the headline. Older reference: F3. |
| G2 | **Written addition.** The KIRA typology (after Gerster and Padberg & Benz) covers misalignment, adding left to right, carries (forgotten, misplaced, extra, none to a zero, none to an empty place), 0 + x = 0, subtraction instead of addition, and basic-fact errors [20]. SchuMaS names three stumbling blocks: non-aligned notation, bundling, and the zero; it adds that written addition is less error-prone than subtraction [17]. KIRA says carries cause "sehr viele Fehler" [20]. | D | Skill order: alignment first. Each listed pattern gets a bug where it computes exactly. |
| G3 | **Written subtraction.** Regrouping errors are about half of all wrongly solved items in the SuVe sample (N > 400), and direction errors are second with Abziehen. From grade 3 to mid-grade 4 regrouping errors fell and direction errors rose. Zero-in-minuend errors were more frequent with Abziehen; perseveration with Ergänzen (L13 in [45]). KIRA and PIKAS list the zero cases one by one [21][22]. | E (via [45]), D | Bug library by method. Zero cases are a separate skill, last. |
| G4 | **Understanding before algorithm.** BW: "Vor der Einführung der schriftlichen Rechenverfahren sind der strukturellen Betrachtung von Aufgaben und dem halbschriftlichen Rechnen ausreichend Raum zu geben" [8]. Sachsen: "Vermeiden jeder zu schnellen Normierung von Lösungswegen" [9]. The Bayern manual's parent letter asks parents not to teach a method early, to avoid confusing mixtures [5]. KIRA: learners should know when the method is not sensible, such as 199 + 2 [20]. | N, D | `kopfrechnen` before `schriftlich` in suggestions. `schriftlich.kopf-oder-schriftlich` exists. Stellenwert labels visible at Stufe 1. Sprechweise includes the place: "4 Einer plus 5 Einer" [17]. |
| G5 | **Multiplication facts.** 77 Austrian children (71 analysed) were tested at the end of grades 3 and 4 in a verification task. Reaction times fell, but errors did not differ significantly between grades. Operand-related distractors (4 × 6 = 28) are the classic effect, cited there as about 75.7 % of children's errors. Fact performance correlated with verbal working memory in grade 3 and visuo-spatial in grade 4 [24]. PIKAS: first understanding, then Kernaufgaben and derivation, never rote rows alone [31][32]. 8 of 48 lower-achieving children had little success with derived facts by the end of grade 3 (L11 in [45]). | E (small), D | Bug `operand`. Keep arrays and derivation in hints. Expect wide variance; provide the Kern path for all. |
| G6 | **Rest notation is disputed.** LISUM: at this point "sollte auf die Schreibweise 20 : 3 = 6 Rest 2 verzichtet werden, da diese mathematisch nicht korrekt ist", while the correct form is hard for children [13]. Sachsen prints "14 : 3 = 4 Rest 2" [9]. Criticism of chained "=" is in C6 of [45]. | N, D | Item layout: "17 : 5 = □ Rest □", two fields, plus Probe "3 · 5 + 2 = 17". Never two "Rest" results chained with "=". |
| G7 | **Größen in VERA-3.** Sachsen-Anhalt 2024/25, 16,760 children at Grundschulen: 45 % solved in the base module (IQB pilot 50 %), 40 % in the harder Größen module (pilot 41 %). Below the Klasse-4 Mindeststandard: 46.36 % globally, 39.84 % in Größen. Level I: compare with same unit, also neighbouring units (2 km ? 1980 m), euro to cents. Level II: mixed units (1 m 50 cm), known comma notation (1,99 €). Level III: mixed units and "Kommaschreibweise mit führender Null" [25]. | E, one Land, descriptive | Stufen in `groessen.geld-komma` follow these levels. Leading zero on Stufe 2. |
| G8 | **Komma as Stellenwert.** LISUM teaches 42,03 € through a table 10 € / 1 € / 10 ct / 1 ct, with "Achtung: 10-Cent-Spalte!" [13]. Money values with mixed units were hard already in Klasse 2 (F15, [55]). | D | Bug `komma-einstellig`. Item family with table at Stufe 3. Always two decimals on screen. |
| G9 | **Area and perimeter.** In a Grade-3 design study in Surabaya (Indonesia, two classes), students could compute both yet struggled to tell them apart, and believed equal areas mean equal perimeters [26] (abstract only). Sachsen separates "Einblick" in Kl. 3 from "Kennen" in Kl. 4 [9]. | Weak E, N | Two skills. Mixed only at `geometrie.umfang` Stufe 3. |
| G10 | **Reading.** NRW's goal for the end of Klasse 4 is "lesen auch komplexere Texte flüssig" [6, p. 24]. In a pilot with 90 children in one school, the Grade-3 word-list score rose from 27.30 to 38.00 items in 60 s across the year (SD about 12–13); Grade 4 from 40.67 to 48.66 [27]. That is not a norm, but it shows a wide spread and steady growth. Rule of thumb of about 100 words per minute for understanding narrative text is general [28][29]. | N, weak E, D | Text rules in section 4 are loosened compared with Klasse 2, not removed. Vorlesen stays visible. |
| G11 | **Word problems.** Word and sentence length, unfamiliar words and semantic structure drive difficulty, and language and number difficulty interact [33]. Representational pictures helped on simple problems, informative ones had negative effects [34]. 17 % realistic reactions at 10–11 (L15 in [45]). | E | One new demand at a time. Pictures repeat text data. `sachaufgaben.frage-pruefen`. |
| G12 | **Feedback.** Children aged 7.2–9.8 (M 8.4, N = 108): immediate verification feedback helped those not taught a strategy and hurt those who had been taught one [38]. | E, one study; not the app's hint type | Keep two-stage hints. Once Sicher, short confirmation. |
| G13 | **Attention and time.** Sustained attention develops fast to 8–9 years, then plateaus; high task load hurts [39] (abstract). NRW sets homework at 45 minutes in Kl. 3–4 [40], as in Kl. 4. VERA-3 pace: 25 items in 40 minutes, 14 in 20 [25]. | E, N | Near-Klasse-4 round length (7.3). |
| G14 | **Touch.** Ages 7–10 missed more targets than older groups, with holdover touches of 3.93 % (adults 0.56 %), and inset targets were missed about twice as often as edge-flush ones [41]. Ages 7–11 touched outside targets 46 % of the time, adults 32 % (N = 14) [42]. NN/g recommends limited motor demands for younger children (practitioner) [43]. | E (small), D | Between Klasse 2 and Klasse 4 values (7.1). 400 ms guard stays. Written cells are large; tap only. |
| G15 | **Type.** 7–9-year-olds read faster at larger x-height [37]. Smaller font and longer lines lowered comprehension in second graders (100 children in grades 2 and 5) [36] (abstract). No Grade-3 data. | E, indirect | Interpolated values (7.1). |
| G16 | **Time pressure.** Time pressure generally acts as a stressor, and the literature is sparse; third and fourth graders with test anxiety did worse under it (via L12 in [45], source [49]). About half of the highest-achieving first and second graders reported medium to high maths anxiety [48]. Expected tangible rewards undermine motivation more in children (d = −0.39) [47]. | E, partly via [45] | **Automatisation is a goal, a clock is not.** Spaced first-try retrieval only. No Blitzrunde in v1. |
| G17 | **Clock.** Analog far below digital, setting harder than reading, in 120 children aged 6–9 (1989 thesis, abstract) [54]. Burny et al. on clock reading were seen only in search listings. | Weak E | Exact minutes on Stufe 2. Digital beside analog on Stufe 1. |
| G18 | **Daten and chance at this age.** We verified no Klasse-3 empirical study on diagram reading or chance language. VERA material advises against standalone "wahrscheinlich" (C10 in [45]). | N only | Scope rests on curricula. Tune in a pilot. |

**Privacy (no change).** Art. 8 DSGVO applies only where processing rests on consent for a service offered directly to a child; below 16 a parent must give or authorise it, and member states may lower the age to 13 [51]. Germany has not lowered it [52]. Mathe 3 keeps the Klasse-4 approach (P1, P2): no accounts, no personal data, no third-party requests, storage only after opt-in.

## 4. Text rules for 8–9-year-olds

**What is known.** The evidence shows *which factors* make text harder (G10, G11, F12, F13). It does not give numerical limits for German 8–9-year-olds. All numbers below are therefore heuristics (H), set between the Klasse-2 rules [46] and the Klasse-4 "3–4 lines" (P11), and chosen to be checkable by a unit test. Words are whitespace tokens; the symbols + − · : = □ do not count.

| # | Rule | Basis |
|---|---|---|
| T1 | Non-story tasks: at most 15 words. | H |
| T2 | Sachaufgaben: at most 25 words on Stufe 1, 32 on Stufe 2, 40 on Stufe 3. | H |
| T3 | At most 4 sentences, including the question. | H |
| T4 | At most 12 words per sentence (14 on Stufe 3). | H; sentence length [33] |
| T5 | No subordinate clauses on Stufe 1–2. On Stufe 3 at most one per task, only with `weil` or `wenn`. Always ban `obwohl, nachdem, während, damit, sodass` and relative clauses. | H; structure [33] |
| T6 | Present tense, active voice. Ban `wird/werden/wurde` + participle, `würde, hätte, wäre`, and the Genitiv where possible. | H |
| T7 | One question, always last. One idea per sentence, at most two numbers per sentence. | H |
| T8 | Everyday words only. Outside an allowlist (Zahlenstrahl, Stellenwerttafel, Überschlag, Umkehraufgabe, Symmetrieachse, Säulendiagramm, Würfelnetz …) at most 14 letters per word. Number words in `zahlen.zahlwort` are exempt. | H; unfamiliar words [33] |
| T9 | No idioms and no double negatives. Repeat the noun instead of `sie`, `er`, `es` across sentences. | H |
| T10 | Digits for quantities, except in `zahlen.zahlwort`. Units as in class: "3,40 €", "3 € 40 ct", "1 h 25 min", "2 km 500 m". Money always with two decimals. No thousands separator: "1000". | N [2][9][25]; C11 |
| T11 | Fachwörter from the Klasse-3 lists: plus, minus, mal, geteilt; Hunderter, Zehner, Einer; Übertrag, Überschlag, Rest; rechter Winkel, Kante, Fläche, Umfang; sicher, möglich, unmöglich. Addieren, subtrahieren, Summe, Differenz only after a definition card. Not Dividend, Divisor, Minuend, Subtrahend in prompts. | N [2][9]; H |
| T12 | The same Übertrag word in both methods, as in the Sprechweise of the method set. Do not mix "Entbündeln" and "Erweitern" text. | N [2]; C7 |
| T13 | Short names with regular spelling (Tom, Mia, Ali, Lea, Ben, Ida). Contexts: Schule, Bücherei, Zoo, Einkaufen, Ausflug, Schulfest. No brands or sensitive topics. | H; C13 |
| T14 | Do not let a keyword predict the operation: "mehr" and "insgesamt" appear across operations. | E [33]; L15 |
| T15 | Pictures show the story and repeat its numbers. No decoration in the task area. Answer-critical data appears only in tables, diagrams and timetables. | E [34] |
| T16 | Hints: at most 14 words and 2 short sentences. Praise: at most 10 words. Worked steps: one line each, at most 4 steps on Stufe 1. | H |
| T17 | "Vorlesen" reads the whole task and hint. Number words must sound right ("dreihundertfünf"), and "3,05 €" must read as "drei Euro fünf". Check for each skill. | E small [35]; P12 |
| T18 | Print-style letters, no italics, no capitals-only words, no automatic hyphenation. | H; P12 |

**Heuristic checks to automate:** a test that runs T1–T5 on sampled generator output, and a word allowlist report for reading review with real children. LIX was considered and not used: we found no verified German norms for this age.

## 5. Typical misconceptions and bug hints

Basis: [n] means the pattern is documented in that source. **H** means it is a plausible pattern from our own didactic reasoning, with no source opened; check these in the pilot. A bug is matched only when the wrong answer computes exactly from the pattern; otherwise a generic step hint is used. Hints name the next step and never judge.

| Area | Bug | Wrong pattern | Hint | Basis |
|---|---|---|---|---|
| Zahlen | `zahlwort-anhaengen` | "neunhunderteinundfünfzig" as 90051; "dreihundertfünf" as 3005 | Eine Zahl bis 999 hat drei Stellen: Hunderter, Zehner, Einer. | [23][30] |
| Zahlen | `null-vergessen` | "dreihundertfünf" as 35 | Keine Zehner? Dann steht dort eine 0. | H, cf. [8] |
| Zahlen | `null-falsche-stelle` | "dreihundertfünf" as 350 | Schau in die Tafel: 3 Hunderter, 0 Zehner, 5 Einer. | H, cf. [8] |
| Zahlen | `zahlendreher` | "dreihundertfünfundvierzig" as 354 | Hör genau hin: Erst kommt der Zehner, dann der Einer. | [23]; F3 |
| Zahlen | `stellen-reihenfolge` | 4 E 3 H 2 Z as 432 | Schau auf die Buchstaben. Die Hunderter stehen vorne. | L14 |
| Zahlen | `buendeln` | 3 H 14 Z as 3140 | 10 Zehner sind 1 Hunderter. Bündle zuerst. | H, cf. [2] |
| Zahlen | `zaehlen-hunderter` | After 399 says 300 or 3100 | Nach 399 ist der Hunderter voll. Es geht mit 400 weiter. | H, cf. F3 |
| Zahlen | `zehner-ueber-hundert` | 295 + 10 gives 205 | 9 Zehner und 1 Zehner sind 1 Hunderter. | H |
| Zahlen | `strahl-schritt` | Reads each tick as 10 when the step is 50 | Schau zuerst: Wie viel ist ein Schritt von Strich zu Strich? | H, cf. [46] |
| Zahlen | `vergleich-ziffern` | 289 > 301, looking at the large digits | Schau zuerst auf die Hunderter. | H |
| Zahlen | `runden-abschneiden` | 347 to the nearest ten gives 340 | 7 Einer sind näher an 350. Runde auf. | H |
| Zahlen | `runden-stelle` | 347 to the nearest hundred gives 350 | Gefragt sind Hunderter. Liegt 347 näher an 300 oder 400? | H |
| Zahlen | `runden-uebergang` | 396 to the nearest ten gives 300 or 3100 | Nach 390 kommt 400. Der Hunderter wird größer. | H |
| Schriftlich | `nicht-stellengerecht` | 587 + 34 written left-aligned gives 927 | Einer unter Einer, Zehner unter Zehner. Schreib die 34 nach rechts. | [17][20] |
| Schriftlich | `von-links` | Starts at the Hunderter; carries go to the wrong column | Fang bei den Einern an. Das ist rechts. | [20][22] |
| Schriftlich | `uebertrag-vergessen` | 376 + 145 gives 411 | 6 + 5 sind 11. 1 Zehner kommt zur Zehnerspalte. | [20] |
| Schriftlich | `uebertrag-zur-null` | 508 + 406 gives 904 | Auch zur 0 kommt der Übertrag: 0 + 0 + 1. | [20] |
| Schriftlich | `uebertrag-zu-viel` | 481 + 315 gives 896 | Bei den Zehnern sind es nur 9. Dann gibt es keinen Übertrag. | [20] |
| Schriftlich | `leerstelle` | 505 + 495 gives 0 or 000 | Schreib den letzten Übertrag vorne hin. Das ist der Tausender. | [20] |
| Schriftlich | `null-plus` | 360 + 49 gives 400 (0 + 9 = 0) | 0 + 9 bleibt 9. Null dazu ändert nichts. | [20] |
| Schriftlich | `kleiner-von-groesser` | 713 − 281 gives 572 | Oben steht die 1, unten die 8. Rechne von oben nach unten. | [21][22]; L13 |
| Schriftlich | `entbuendeln-vergessen` | 713 − 281 gives 532 (Abziehen) | Du hast einen Hunderter gewechselt. Oben ist nun einer weniger. | [21]; L13 |
| Schriftlich | `uebertrag-ergaenzen` | 713 − 281 gives 532 (Ergänzen) | Du hast erweitert. Der Hunderter unten bekommt 1 dazu. | [21]; L13 |
| Schriftlich | `null-minus` | 605 − 213 gives 402 (0 − 1 = 0) | 0 − 1 geht nicht. Wechsle einen Hunderter. | [21][22] |
| Schriftlich | `minus-null` | 847 − 205 gives 602 (4 − 0 = 0) | Nichts abziehen heißt: Die 4 bleibt. | [21][22] |
| Schriftlich | `ueber-die-null` | 403 − 178 gives 335 | Bei 0 Zehnern wechselst du zuerst einen Hunderter. | [21][22]; L13 |
| Schriftlich | `plus-statt-minus` | 713 − 281 gives 994 | Schau noch einmal auf das Rechenzeichen. | [21][22] |
| Schriftlich | `gleiche-ziffern` | 753 − 251 gives 402 (extra Übertrag at equal digits) | 5 − 5 sind 0. Hier wechselst du nichts. | [21][22] |
| Schriftlich | `stellenzahl` | 756 − 94 gives 762 | Die 94 hat keine Hunderter. Oben wird trotzdem einer gewechselt. | [21][22] |
| Schriftlich | `mal-uebertrag` | 234 · 3 gives 692 | 3 · 4 sind 12. 1 Zehner kommt zur nächsten Spalte. | H, cf. L13 |
| Kopfrechnen | `operand` | 4 · 6 = 28 or 18 | Fast! Rechne 2 · 6 und verdopple. | [24] |
| Kopfrechnen | `mal-als-plus` | 6 · 8 = 14 | 6 · 8 heißt 6-mal die 8. Fang mit 5 · 8 an. | H, [46] |
| Kopfrechnen | `mal-null` | 5 · 0 = 5 | 5-mal gar nichts bleibt nichts. | H |
| Kopfrechnen | `null-verloren` | 6 · 40 = 24 | 6 · 4 sind 24. Bei 40 sind es Zehner: 24 Zehner. | H, cf. [2] |
| Kopfrechnen | `null-zu-viel` | 6 · 40 = 2400 | Nur die 40 hat eine Null. Zähle die Nullen noch einmal. | H, cf. [2] |
| Kopfrechnen | `teilen-null` | 240 : 6 = 4 | 6 · 4 sind 24. Für 240 brauchst du 6 · 40. | H, cf. [13] |
| Kopfrechnen | `hunderter-uebergang` | 380 + 50 gives 330 or 3130 | 8 Zehner und 5 Zehner sind 13 Zehner. Das ist 1 Hunderter mehr. | H |
| Kopfrechnen | `stelle-verwechselt` | 340 + 5 gives 390 | 5 sind Einer. Der Zehner bleibt gleich. | H, [46] |
| Kopfrechnen | `minus-spalten` | 432 − 58 gives 426 | 2 − 8 geht nicht. Rechne erst bis 430, dann weiter. | L13 |
| Kopfrechnen | `ergaenzen-1000` | 1000 − 233 gives 877 | Bis zur 1000: Bei den Hundertern und Zehnern geht es bis 9. | H |
| Kopfrechnen | `zerlegen-einer` | 7 · 23 gives 143 | Auch die 3 wird mal genommen: 7 · 20 und 7 · 3. | H, cf. [8][13] |
| Kopfrechnen | `rest-zu-gross` | 17 : 5 = 2 Rest 7 | Der Rest muss kleiner als 5 sein. | C6 |
| Kopfrechnen | `rest-vergessen` | 17 : 5 = 3 with no Rest | Prüfe: 3 · 5 sind 15. Bis 17 fehlen noch 2. | H |
| Kopfrechnen | `rest-komma` | 17 : 5 gives 3,2 | Schreib den Rest als ganze Zahl: Wie viele bleiben übrig? | H |
| Kopfrechnen | `punkt-strich` | 2 + 3 · 4 gives 20 | Mal kommt zuerst: Rechne erst 3 · 4. | H, cf. [9] |
| Größen | `komma-einstellig` | 3,05 € as 3 € 50 ct | Nach dem Komma stehen 2 Stellen. 05 heißt 5 Cent. | [13][25] |
| Größen | `komma-cent-summe` | 2,50 € + 1,80 € gives 3,130 € | 50 ct und 80 ct sind 130 ct. Das ist 1 € 30 ct. | H, cf. [13] |
| Größen | `einheiten-gemischt` | Adds all printed numbers: 3 € 40 ct as 43 | Rechne Euro und Cent getrennt: erst Euro, dann Cent. | [55]; F15 |
| Größen | `rueckgeld-cent` | 20 € − 12,40 € gives 8,40 € | Rechne von 12,40 € erst bis 13 €, dann bis 20 €. | H, cf. F15 |
| Größen | `lineal-anfang` | Measures from 1 rather than 0 | Lege den Anfang auf die 0, nicht auf die 1. | H, [46] |
| Größen | `mm-cm` | 3 cm 5 mm as 305 mm | 1 cm sind 10 mm. 3 cm sind also 30 mm. | H, cf. [13] |
| Größen | `m-komma` | 1,20 m as 1 m 2 cm | Nach dem Komma stehen die Zentimeter: 20 cm. | H, cf. [25] |
| Größen | `km-100` | 3 km as 300 m | 1 km sind 1000 m. | H, cf. [13] |
| Größen | `kg-100` | 2 kg as 200 g | 1 kg sind 1000 g. Denk an die Packung Mehl. | H, cf. [8][9] |
| Größen | `halb-kg` | ½ kg as 50 g | Die Hälfte von 1000 g sind 500 g. | H, cf. [9] |
| Größen | `skala-schritt` | Reads scale marks as 10 g when the step is 100 g | Schau: Wie viel Gramm ist ein Strich? | H, cf. [12] |
| Größen | `zeiger-getauscht` | Reads hour and minute hands swapped | Der kurze Zeiger zeigt die Stunde, der lange die Minuten. | H, cf. [54] |
| Größen | `minute-zahl` | Long hand at 4 read as 4 minutes | Von Zahl zu Zahl sind es 5 Minuten. Bei der 4 sind es 20. | H, cf. [54] |
| Größen | `stunde-100` | 13.50 Uhr plus 45 min as 13.95 Uhr | Eine Stunde hat 60 Minuten. Rechne erst bis 14 Uhr. | [5]; H |
| Größen | `stunde-komma` | 1,5 h as 1 h 5 min | Eine halbe Stunde sind 30 Minuten. | H, cf. C8 |
| Größen | `minute-100` | 1 min as 100 s | 1 Minute hat 60 Sekunden. | H, cf. [2] |
| Größen | `zeitpunkt-spanne` | Gives 9 Uhr instead of 2 Stunden | Gefragt ist: Wie lange? Nicht: Wann? | [9]; H |
| Größen | `liter-25` | ¼ l as 25 ml | 1 l sind 1000 ml. Ein Viertel davon sind 250 ml. | H, cf. [2] |
| Geometrie | `flaeche-umfang` | Gives Kästchen count when Umfang is asked, or the reverse | Umfang ist der Weg außen herum. Fläche ist, was drinnen liegt. | [26] |
| Geometrie | `gleiche-flaeche-gleicher-umfang` | "Gleiche Fläche, also gleicher Umfang" | Zähle beide Wege nach. Der Umfang kann verschieden sein. | [26] |
| Geometrie | `umfang-halb` | Rectangle 3 by 4 gives 7 | Geh einmal ganz herum: Das sind vier Seiten. | H |
| Geometrie | `umfang-kaestchen` | Counts border squares rather than edges | Zähle die Kanten am Rand, nicht die Kästchen. | H |
| Geometrie | `kanten-verdeckt` | Counts only visible edges | Denk auch an die Kanten, die du nicht siehst. | H, [46] |
| Geometrie | `wuerfel-verdeckt` | Skips hidden cubes | Unter einem oberen Würfel steht noch einer. | H, [46] |
| Geometrie | `netz-sechs-reicht` | Accepts any six squares as a net | Falte im Kopf: Liegen zwei Flächen übereinander? | H, cf. [2] |
| Geometrie | `netz-gegenueber` | Takes neighbouring squares as opposite | Gegenüber liegen Flächen, zwischen denen eine Fläche liegt. | H, cf. [13] |
| Geometrie | `quadrat-gedreht` | Rotated square not named Quadrat | Dreh das Bild im Kopf: Alle Seiten sind gleich lang. | H, [46] |
| Geometrie | `verschoben-statt-gespiegelt` | Copies instead of mirroring | Das Bild klappt um. Was links ist, kommt nach rechts. | H, [46] |
| Geometrie | `parallel-senkrecht` | Swaps the two words | Parallel treffen sich nie. Senkrecht bilden einen rechten Winkel. | H |
| Daten und Zufall | `achse-schritt` | Reads column height as count, step 5 | Schau an der Achse, wie viel ein Kästchen zählt. | [13]; H |
| Daten und Zufall | `bild-legende` | Counts pictures when 1 picture = 10 | Schau in die Legende: Ein Bild steht für 10. | H, [46] |
| Daten und Zufall | `mehr-unterschied` | Gives the larger value for "wie viel mehr" | Gefragt ist der Unterschied: Wie viele sind es mehr? | F17 |
| Daten und Zufall | `fahrplan-spanne` | 8.45 to 9.10 gives 65 min | Rechne erst bis 9 Uhr, dann die 10 Minuten dazu. | H, cf. [2] |
| Daten und Zufall | `kombi-addiert` | 3 T-Shirts, 3 Hosen gives 6 | Jedes T-Shirt passt zu jeder Hose. Zähle alle Paare im Baum. | H, task [2] |
| Daten und Zufall | `sicher-haeufig` | "sicher" because most balls are red | Sicher heißt: Es kommt immer so. Gibt es andere Kugeln? | H |
| Daten und Zufall | `anzahl-statt-anteil` | 3 red of 10 beats 2 red of 3 | Schau auch auf die anderen Kugeln. Wie viele sind nicht rot? | H, cf. [13] |
| Daten und Zufall | `sechs-seltener` | "Die 6 kommt seltener" | Jede Zahl am Würfel hat die gleiche Chance. | H |
| Sachaufgaben | `alle-zahlen` | Computes with all numbers regardless of the question | Schau: Welche Zahlen brauchst du für diese Frage? | [33] |
| Sachaufgaben | `signalwort` | "mehr", so adds | Stell dir die Geschichte vor. Wird es mehr oder weniger? | H, cf. [33] |
| Sachaufgaben | `mal-als-mehr` | "3-mal so viel wie 40" gives 43 | 3-mal so viel heißt: 40 + 40 + 40. | H |
| Sachaufgaben | `nur-erster-schritt` | Gives the intermediate result | Das ist schon ein guter Schritt. Was fragt die Geschichte am Ende? | H, cf. [2] |
| Sachaufgaben | `unsinnig-gross` | Accepts an impossible result | Kann das stimmen? Denk an einen echten Einkauf. | H, cf. [2] |
| Sachaufgaben | `rest-sache` | 17 Kinder, 5 per car, gives 3 cars | Alle Kinder sollen mitfahren. Reichen 3 Autos? | [9]; L15 |
| Sachaufgaben | `einheit-gemischt` | Adds 2 km and 300 m as 302 | Rechne zuerst alles in Meter um. | H, cf. [13] |

## 6. Skill catalogue

**Format.** S1, S2, S3 are Stufen; each cell is the content of that Stufe, and AB varies the demand inside it; each cell is at most 12 words. Numbers and results stay ≤ 1000, except unit conversions in `groessen`. Answer types and visuals use the existing app vocabulary; `none` means no visual. **Basis** cites the Bayern Lernbereich (BY), the NRW strand of the end-of-Kl.-4 column, and **SN Kl. 3** when Sachsen places the skill in Klassenstufe 3. **Status** is `core` or `opt` (optional = placed in Klasse 3 by only a minority of the sources read, or not named in several). Skills appear in teaching order. Subsections are deliberately unnumbered: this section has no §6.4 (see 7.2).

### `zahlen` (Zahlen bis 1000)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `zahlen.buendeln` | Hunderter bündeln | Du bündelst zehn Zehner zu einem Hunderter. | Base-ten picture to number, 100–999, no bundling | 10 Z = 1 H; 3 H 14 Z = 440 | Unbundle: 300 as Zehner; fewest blocks for 1000 | multi, number | baseTen, placeValue | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.stellenwerte` | Hunderter, Zehner, Einer | Du liest die Stellenwerttafel und schreibst die Zahl. | Table to number, H Z E, no zeros | Zeros: 3 H 5 E; unordered: 4 E 3 H 2 Z | Split 348 = 300 + 40 + 8; value of a digit | multi, number | placeValue | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.zahlwort` | Zahlen lesen und hören | Du hörst ein Zahlwort und schreibst die Zahl. | Word to number, no zeros, options without look-alikes | Words with zeros: dreihundertfünf; look-alike options 305, 350, 3005 | Type the number from audio; number to word | choice, number | placeValue | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.zaehlen` | Zählen in Schritten | Du zählst vorwärts und rückwärts, auch über Hunderter. | Steps of 10 and 100 from a multiple | Steps of 1 and 10 crossing a hundred: 395, 405 | Steps of 25, 50, any start; find the rule | multi | numberLine | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.nachbarn` | Nachbarzahlen | Du findest die Zahlen davor und danach und die Nachbarhunderter. | Vorgänger, Nachfolger inside a ten | Nachbarzehner, Nachbarhunderter of 347; across 399, 400 | Riddles from two neighbour clues, ≤ 1000 | multi | numberLine | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.vergleichen` | Größer oder kleiner | Du vergleichst Zahlen mit <, > und =. | Different hundreds: 289 and 301 | Same hundreds; digit swaps like 354 and 345 | Order 5 numbers; largest number from three digit cards | choice, order | placeValue | BY 1.1; NRW Zahlverständnis; SN Kl. 3 | core |
| `zahlen.zahlenstrahl` | Zahlenstrahl bis 1000 | Du liest und zeigst Zahlen am Zahlenstrahl. | Read arrow on 0–1000, ticks every 100 | Place a number, ticks every 50; section 300–400 | Empty line 0–1000, estimate; section with ticks of 5 | numberline | numberLine | BY 1.1; NRW representations; SN Kl. 3; [13] | core |
| `zahlen.runden` | Runden | Du findest den nächsten Zehner oder Hunderter. | Round to tens, staying inside the hundred | Round to hundreds; 347 to 300 | Crossing: 396 to 400; which numbers round to 350? | number, choice | numberLine | NRW Überschlagendes Rechnen; SN Kl. 3; BY via Überschlag | core |
| `zahlen.tausenderbuch` | Tausenderbuch | Du findest dich auf einer Seite im Tausenderbuch zurecht. | One page 301–400: find a number, neighbours | Cut-out piece: ±1, ±10; fill the gaps | Piece across pages; find the wrong number | number, choice | hundredChart | [16]; BY not named; SN not named | opt |

### `schriftlich` (Schriftlich rechnen)

The Verfahren setting (Abziehen, Ergänzen; default Abziehen) applies to every minus skill, and the visual, Sprechweise and bug library change with it. Sums and Minuenden stay ≤ 1000.

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `schriftlich.stellengerecht` | Richtig untereinander | Du schreibst Einer unter Einer und Zehner unter Zehner. | Choose correct layout, two 3-digit numbers | Different lengths: 587 + 34; enter digits in columns | Three numbers, different lengths; find the misaligned layout | choice, multi | written | BY 1.2; NRW Ziffernrechnen; SN Kl. 3; [17][20] | core |
| `schriftlich.addieren` | Plus ohne Übertrag | Du rechnest von den Einern aus Stelle für Stelle. | Two 2- or 3-digit numbers, no carry | Different lengths; a zero in a column | Missing digit; three numbers, no carry | written | written | BY 1.2; NRW Ziffernrechnen; SN Kl. 3 | core |
| `schriftlich.addieren-uebertrag` | Plus mit Übertrag | Du trägst einen vollen Zehner in die nächste Spalte. | One carry, two numbers, sum ≤ 999 | Two carries, zeros: 508 + 406; sum ≤ 1000 | Three numbers; Ziffernkarten: largest sum; Fehlerdetektiv | written, choice | written | BY 1.2; NRW Ziffernrechnen; SN Kl. 3; [17] | core |
| `schriftlich.subtrahieren` | Minus ohne Übertrag | Du rechnest von den Einern aus untereinander minus. | 3-digit minus 3-digit, no regrouping | Different lengths; zeros: 847 − 205 | Missing digit; check with plus | written | written | BY 1.2; NRW Ziffernrechnen; SN Kl. 3 | core |
| `schriftlich.subtrahieren-uebertrag` | Minus mit Übertrag | Du rechnest minus, auch wenn oben zu wenig steht. | One regrouping in ones or tens, no zeros | Two regroupings: 432 − 158 | Fehlerdetektiv; choose the fitting Sprechweise | written, choice | written | BY 1.2 (Abziehen); NRW Ziffernrechnen; BW (11); SN Kl. 3 | core |
| `schriftlich.null` | Minus mit Null | Du rechnest sicher, auch wenn oben eine Null steht. | Zero below: 847 − 205 | Zero above: 605 − 213 | Regroup across zero: 403 − 178, 1000 − 233 | written | written | BY 1.2; NRW Ziffernrechnen; [21][22]; L13 | core |
| `schriftlich.pruefen` | Überschlagen und prüfen | Du schätzt vorher und prüfst nachher dein Ergebnis. | Choose the fitting Überschlag, round to hundreds | Enter Überschlag, then compute; check with Umkehraufgabe | Result far from Überschlag: find the mistake | written, choice, multi | written, numberLine | BY 1.2; NRW Überschlagendes Rechnen; BW (14); SN Kl. 3 | core |
| `schriftlich.kopf-oder-schriftlich` | Im Kopf oder schriftlich? | Du entscheidest, welcher Weg hier leichter ist. | Round numbers: 400 + 300, head or written | Near tens: 356 + 199; choose and solve | Zero-rich: 1000 − 233; compare two ways | choice, number | written, numberLine | BY 1.2; NRW Flexibles Rechnen; [5][18] | core |
| `schriftlich.multiplizieren` | Mal schriftlich | Du rechnest eine große Zahl mal eine kleine Zahl. | 2-digit · 1-digit, no carry | 3-digit · 1-digit, one carry | Product ≤ 1000, two carries; Fehlerdetektiv | written | written | SN Kl. 3 only; BY, NRW by end of Kl. 4 | opt |

### `kopfrechnen` (Kopfrechnen und Einmaleins)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `kopfrechnen.analog` | Kleine und große Aufgabe | Du nutzt 3 + 4, um 300 + 400 zu rechnen. | 3 + 4, so 300 + 400 | 12 + 3, so 120 + 30; minus too | Choose the matching small task; continue a Päckchen | number, choice | baseTen | BY 1.2; NRW Kopfrechnen; BW (13) | core |
| `kopfrechnen.plus-minus` | Plus und Minus bis 1000 | Du rechnest in Schritten am Rechenstrich. | HZE ± Hunderter or Zehner: 340 + 50, no crossing | Crossing a hundred: 380 + 50, 420 − 70 | HZE ± HZE stepwise: 367 + 248; missing number | number, multi | numberLine | BY 1.2; NRW Zahlenrechnen; SN Kl. 3; [13] | core |
| `kopfrechnen.ergaenzen` | Bis zum Hunderter und bis 1000 | Du findest, wie viel bis zur nächsten vollen Zahl fehlt. | To next hundred: 370 + □ = 400 | To 1000 from hundreds and tens: 640 | To 1000 from any number: 233; backwards too | number | numberLine | NRW Kopfrechnen; [5][13] | core |
| `kopfrechnen.einmaleins` | Einmaleins sicher | Du weißt alle Malaufgaben und übst sie immer wieder. | Kernaufgaben and squares, spaced, never row by row | All 100 facts; missing factor □ · 7 = 56 | Strategy choice for hard facts: 7 · 8, 6 · 7 | number, choice | dotArray | BY 1.2; NRW Kopfrechnen; SN Kl. 3 | core |
| `kopfrechnen.umkehren` | Geteiltaufgaben sicher | Du findest zu jeder Malaufgabe die Geteiltaufgabe. | Divisors 1, 2, 5, 10 from Mal facts | All 90 facts, divisors 1–10, never by 0 | Family of four; missing divisor: 56 : □ = 7 | number, multi | dotArray | BY 1.2; NRW Kopfrechnen; SN Kl. 3 | core |
| `kopfrechnen.zehnerzahlen` | Mal und geteilt mit Zehnerzahlen | Du nutzt 6 · 4, um 6 · 40 zu rechnen. | · 10, · 100: 7 · 100; 800 : 10 | 6 · 40, 240 : 6, product ≤ 1000 | Missing factor: □ · 30 = 210; 360 : 60 | number | placeValue | BY 1.2; SN Kl. 3; [5][13] | core |
| `kopfrechnen.in-schritten` | Malnehmen und Teilen in Schritten | Du zerlegst eine Zahl und rechnest zwei leichte Aufgaben. | 7 · 23 as 7 · 20 + 7 · 3 | 96 : 4 as 80 : 4 + 16 : 4 | Nachbaraufgabe: 9 · 30 from 10 · 30; 3-digit · 1-digit | multi, number | dotArray | BY 1.2; NRW Zahlenrechnen; SN Kl. 3; [13] | core |
| `kopfrechnen.teilen-rest` | Teilen mit Rest | Du teilst und schaust, was übrig bleibt. | Dividend ≤ 50, divisor 2–5, with picture | Dividend ≤ 90, divisors 2–9 | Find the Rest first; Probe: 3 · 5 + 2 = 17 | multi | dotArray | SN Kl. 3; BY 1/2 and [5]; BW (12); [14] | core |
| `kopfrechnen.punkt-strich` | Mal zuerst | Du rechnest die Malaufgabe vor der Plusaufgabe. | Mal first: 2 + 3 · 4, small numbers | Minus with Mal: 20 − 3 · 4 | Compare terms: 5 + 4 · 3 and 7 · 3 | number, choice | none | SN Kl. 3; [13]; BY, NRW not named | opt |

### `groessen` (Geld, Längen, Zeit, Gewicht)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `groessen.geld-komma` | Euro und Cent mit Komma | Du schreibst Geldbeträge mit Komma und ohne Komma. | 3,40 € = 3 € 40 ct, whole tens of cents | Leading zero: 3,05 €; cents to euros | Order mixed notations; Stellenwerttafel 10 € 1 € 10 ct 1 ct | multi, number, order | money, placeValue | BY 3.1; NRW Größen; [13][25] | core |
| `groessen.einkaufen` | Einkaufen und Rückgeld | Du rechnest Preise zusammen und findest das Rückgeld. | Two prices, whole euros and 50 ct, ≤ 100 € | Comma prices, Rückgeld from 20 € or 50 € | Three items, enough money? Stückelung with fewest notes | number, choice | money | BY 3.3; NRW Größen; SN Kl. 3 | core |
| `groessen.laengen` | Millimeter, Zentimeter, Meter | Du misst genau und wandelst Längen um. | Measure in cm and mm on the ruler | 1 cm = 10 mm; 3 cm 5 mm = 35 mm | 1,20 m = 120 cm; order mixed lengths | number, order | ruler | BY 3.1; NRW Größen; SN Kl. 3; [13] | core |
| `groessen.kilometer` | Kilometer | Du weißt, wie lang ein Kilometer ist. | 1 km = 1000 m; choose m or km | 2 km 500 m = 2500 m; ≤ 9 km | ½ km = 500 m; 1,7 km = 1700 m | number, choice | none | BY 3.1; NRW Größen; SN Kl. 3; [13] | core |
| `groessen.uhr` | Uhrzeit auf die Minute | Du liest die Uhr ganz genau ab. | Five-minute steps, analog beside digital | Exact minutes, analog only, read and choose | Pick the clock for 13.50 Uhr, 24-hour times | choice, multi | clock | NRW Größen; SN Kl. 3; [5] | core |
| `groessen.zeitspannen` | Wie lange dauert das? | Du rechnest mit Minuten und Stunden. | Spans inside one hour, in minutes | Across a full hour: 13.50 Uhr plus 45 min | 1 h 25 min = 85 min; 1 min = 60 s | number, multi | clock, numberLine | BY 3.1; NRW Größen; SN Kl. 3; [5] | core |
| `groessen.gewicht` | Gramm und Kilogramm | Du wiegst und wandelst Gramm und Kilogramm um. | Choose g or kg; read scale, step 100 g | 1 kg = 1000 g; 2 kg 300 g = 2300 g | ½ kg = 500 g; add weights; Stützpunkt Mehl | number, choice | scale | BY 3.1; NRW Größen; SN Kl. 3; [5][13] | core |
| `groessen.was-passt` | Was passt? | Du schätzt mit Dingen, die du gut kennst. | Choose the fitting unit for known objects | Choose fitting value: Tür 2 m, Apfel 150 g | Kann das stimmen? Find the impossible value | choice | none | BY 3.2; NRW Größen; BW 3.2.3.1 (5); SN Kl. 3 | core |
| `groessen.hohlmasse` | Liter und Milliliter | Du misst, wie viel in ein Gefäß passt. | Choose l or ml; read a Messbecher | 1 l = 1000 ml; ½ l = 500 ml | ¼ l and ¾ l; pour into 250 ml cups | number, choice | container | BY 3.1; NRW Größen; SN Kl. 4, not Kl. 3 | opt |

### `geometrie`

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `geometrie.figuren` | Figuren und rechte Winkel | Du erkennst Figuren und ihre rechten Winkel. | Name figures, also rotated; count Ecken and Seiten | Find rechte Winkel; Quadrat is also a Rechteck | Parallelogramm (Sachsen); sort by properties | choice, number | shape | BY 2.2; NRW Ebene Figuren; SN Kl. 3 | core |
| `geometrie.parallel-senkrecht` | Parallel und senkrecht | Du erkennst, wie zwei Linien zueinander liegen. | Two lines: parallel or senkrecht, on grid | Find such sides in figures | Which figure has two parallel pairs? | choice | grid, shape | BW 3.2.2.2 (3); NRW Ebene Figuren; SN Kl. 3; [13]; BY not named | opt |
| `geometrie.koerper` | Körper | Du kennst Körper und ihre Ecken, Kanten und Flächen. | Würfel, Quader, Kugel, Zylinder; Ecken, Kanten, Flächen | Add Pyramide, Kegel; sort by properties | Views: which solid from above? Riddles with clues | choice, number | solid | BY 2.2; NRW Körper; SN Kl. 3 | core |
| `geometrie.wuerfelgebaeude` | Würfelgebäude | Du zählst Würfel und liest Baupläne. | Count cubes ≤ 12, hidden cubes shown by plan | Building to Bauplan; ≤ 20 cubes | Cubes missing to complete a Quader; match views | number, choice | cubeBuilding | BY 2.1; NRW Körper; SN Kl. 3 | core |
| `geometrie.netze` | Würfelnetze | Du faltest im Kopf und prüfst, ob ein Würfel entsteht. | Is this a Würfelnetz? Clear nets, 6 squares | All 11 nets and distractors, rotated | Opposite faces; Quadernetz (Sachsen, BW, Bayern) | choice, cells | net | BY 2.2; NRW Körper; BW 3.2.2.2 (8); SN Kl. 3; [13] | core |
| `geometrie.symmetrie` | Spiegeln | Du findest die Spiegelachse und ergänzt das Spiegelbild. | Find the axis: symmetric yes or no | Complete mirror image on grid, vertical axis | Horizontal axis; count axes of a figure | choice, cells | grid, shape | BY 2.3; NRW Symmetrie; BW 3.2.2.3; [13] | core |
| `geometrie.flaeche` | Flächen auslegen | Du legst mit Kästchen aus und vergleichst. | Count Kästchen, rectangles, ≤ 20 | Composite figures ≤ 30; which is larger? | Half Kästchen; same area, different shape | number, choice, cells | grid | NRW Ebene Figuren; BW 3.2.2.4; SN Kl. 3; [5] | core |
| `geometrie.umfang` | Einmal außen herum | Du zählst den Weg rund um eine Figur. | Walk around a rectangle, count edges, ≤ 20 | Composite figures; sides given in cm | Mixed with Fläche: same area, different Umfang | number, choice | grid | NRW Ebene Figuren; BW 3.2.2.4; SN Kl. 3; [5] | core |
| `geometrie.muster` | Bandornamente | Du findest die Regel und setzt das Muster fort. | Continue a Bandornament with one rule | Mirrored and shifted pieces: which comes next? | Find the wrong piece; Parkett: which piece fits? | choice, cells | grid, shape | BY 2.4; NRW Ebene Figuren; SN Kl. 3 | core |

### `daten` (Daten und Zufall)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `daten.tabelle` | Tabellen lesen | Du findest Zahlen in einer Tabelle und rechnest damit. | One value, ≤ 5 rows, values ≤ 100 | Compare and total, two columns | Value not shown directly; question the table cannot answer | number, choice | table | BY 4.1; NRW Daten; SN Kl. 3 | core |
| `daten.darstellen` | Strichliste, Tabelle, Diagramm | Du überträgst Daten von einer Darstellung in die andere. | Tally to table, ≤ 50 | Table to fitting Säulendiagramm, ≤ 50 | Find the wrongly copied value | multi, choice | tally, table, barChart | BY 4.1; NRW Daten; SN Kl. 3; [13] | core |
| `daten.diagramme` | Säulen und Balken | Du liest Diagramme ab und vergleichst. | Read value, axis step 1 or 2 | Step 5 or 10, difference, total, ≤ 100 | Balken step 50, ≤ 500; value between marks | number, choice | barChart, pictogram | BY 4.1; NRW Daten; BW 3.2.4.1; SN Kl. 3 | core |
| `daten.fahrplan` | Fahrplan und Preisliste | Du findest Zeiten und Preise und rechnest damit. | Read a departure or price, 3 rows | Which bus arrives first; total from Preisliste | Travel time from two times, within 60 min | number, choice | table, clock | BY 4.1; SN Kl. 3; NRW Daten | core |
| `daten.kombinieren` | Wie viele Möglichkeiten? | Du findest alle Möglichkeiten und zählst sie. | Pairs around 2 · 3 (2 · 2 to 2 · 4), table, no pictures | 3 · 3 pairs; order of 3 things | 3 · 3 · 2 with Baumdiagramm (Bayern) | number, choice | tree, table | BY 1.3; NRW Wahrscheinlichkeiten; BW 3.2.1.3 (10); SN Kl. 3 | core |
| `daten.sicher-moeglich` | Sicher, möglich, unmöglich | Du sagst, ob etwas sicher, möglich oder unmöglich ist. | Bag or Würfel: sicher, möglich, unmöglich | Spinner; möglich, aber nicht sicher | Order events: wahrscheinlich, unwahrscheinlich (SN, NRW) | choice, order | bag, spinner, dice | BW 3.2.4.2 (2); NRW Wahrscheinlichkeiten; SN Kl. 3; C10 | core |
| `daten.chancen` | Wo sind die Chancen größer? | Du vergleichst Säckchen, Würfel und Glücksräder. | Same total: which bag gives red more often? | Spinners with equal sectors, compare by count | Change the bag; is the game fair? | choice | bag, spinner, dice | BY 4.2; BW 3.2.4.2 (1); [13] | core |

### `sachaufgaben`

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status |
|---|---|---|---|---|---|---|---|---|---|
| `sachaufgaben.rechnung-finden` | Welche Rechnung passt? | Du findest die Rechnung zur Geschichte. | Two options, plus or minus, ≤ 1000 | All four operations; story to Term | Which question fits; keyword misleads | choice | none | BY 1.3; NRW Operationsverständnis; SN Kl. 3 | core |
| `sachaufgaben.ein-schritt` | Geschichten mit einer Rechnung | Du löst eine Geschichte mit einer Rechnung. | Plus or minus, ≤ 1000, all data needed | Mal or geteilt, ≤ 1000 | Start or change unknown; one unneeded number | number | numberLine, dotArray | BY 1.3; NRW Sachsituationen; SN Kl. 3 | core |
| `sachaufgaben.vergleichen` | Wie viel mehr? Wievielmal? | Du vergleichst zwei Mengen. | Difference, ≤ 1000 | 3-mal so viel, product ≤ 1000 | Reverse: Tom has 120, 3-mal so viel wie Mia | number | numberLine | NRW Operationsverständnis; [5]; BY 1.3 | core |
| `sachaufgaben.rest-deuten` | Was bedeutet der Rest? | Du überlegst, was mit dem Rest passiert. | Aufteilen with Rest, picture, dividend ≤ 50 | Round up: 17 Kinder, 5 per car | Round down or up: choose from the story | number, choice | dotArray | SN Kl. 3; L15 | core |
| `sachaufgaben.mit-groessen` | Geschichten mit Größen | Du rechnest mit Euro, Metern, Gramm oder Minuten. | Euro and km whole numbers, one step | Comma prices, kg and g, one step | Time spans and mixed units, two steps | number | money, ruler, scale, clock | BY 3.3; NRW Größen; BW 3.2.3.2; SN Kl. 3 | core |
| `sachaufgaben.zwei-schritte` | Zwei Schritte | Du rechnest zwei Schritte nacheinander. | Plus then plus, ≤ 500, with picture | Buy items then Rückgeld; Mal then plus | Data from a table; three numbers, two steps | multi, number | money, table | BY 1.3 (mehrschrittig); [5]; SN Kl. 3 | core |
| `sachaufgaben.menge-preis` | Je mehr, desto mehr | Du erkennst: Doppelte Menge, doppelter Preis. | Double amount, double price, table | Table with 1, 2, 5, 10 pieces | Je mehr, desto weniger: more helpers, less time | number, multi | table | BY 3.3; BW 3.2.1.2 (17); SN Kl. 3 | core |
| `sachaufgaben.frage-pruefen` | Passt das? | Du prüfst, ob Frage und Antwort Sinn ergeben. | Is the result plausible? | Extra number not needed | Nicht lösbar; Kapitänsaufgabe | choice, number | none | BY 3.3; NRW Sachsituationen; [5] | core |
| `sachaufgaben.genau-ungefaehr` | Genau oder ungefähr? | Du entscheidest, ob ein Überschlag reicht. | Exact or Überschlag: enough money? | Überschlag to decide with three prices | Fermi with given reference values, choice answers | choice | none | BY 1.3, 3.3; NRW Sachsituationen; BW 3.2.1.3 (5) | opt |

### New visuals needed

**None.** Every skill can use the listed visuals. Five existing visuals need extensions:

| Visual | Extension | Sources |
|---|---|---|
| `baseTen` | Add Hunderterplatten (and one Tausenderwürfel for 1000) | [2][8] |
| `hundredChart` | Start offset (301–400) for the Tausenderbuch | [16] |
| `placeValue` | Custom column headers for money (10 €, 1 €, 10 ct, 1 ct) | [13] |
| `written` | The Klasse-4 visual already has `op`, `operands`, `method`, `masks` and planted results. It needs H Z E headers, an optional Bayern-style Strich for the Entbündeln mark, and a three-Summanden layout check at ≤ 3 digits | [5][9][17] |
| `numberLine` | Time labels (13.50, 14.00), so jump arcs work for Zeitspannen. Jump arcs are the Klasse-2 extension | [5] |

`barChart` already has a `horizontal` option in the Klasse-4 code, so Balkendiagramme need no change.

## 7. Design consequences compared with the Klasse 2 and Klasse 4 portals

### 7.1 What stays and what changes

| Area | Klasse 2 [46] | Klasse 3 | Klasse 4 [45] | Why |
|---|---|---|---|---|
| **Round length** | 8 items | **10 items; 8 in `schriftlich`** | 10 items | 7.3; H |
| **AB mix (I/II/III)** | S1 5/2/1, S2 3/3/2, S3 2/4/2 | **10 items: S1 6/3/1, S2 4/4/2, S3 2/5/3.** 8 items: as Klasse 2 | S1 7/2/1, S2 4/4/2, S3 2/5/3 | C3; H |
| **Font** | 22–24 px body, ≤ 45ch, expression ≥ 2.5rem | **21 px body, line-height 1.5, ≤ 52ch, expression ≥ 2.5rem** | 20 px body, ≤ 60ch, expression 2.25–2.5rem | G15; H |
| **Touch targets** | Keypad and answers 72 px; others 56 px | **Keypad, answers, Prüfen 68 px; others 52 px**; gaps ≥ 8 px with extended hit areas; written cells ≥ 56 px | Primary 64 px; others 48 px | G14; H |
| **Keypad default** | Keypad first on every device; no comma key | **Keypad first on every device, physical keyboard still works. Comma key only on items that accept a comma** | Free numeric; keypad on touch, comma always | G14; 2.2 |
| **Timed mode** | None | **None in v1.** Default no timers | None by default; optional Blitzrunde for Gemeistert facts | G16 |
| Silent response time | Not at launch | **Off at launch.** Consider 5 s for review scheduling after a pilot; never shown | About 3 s keeps a fact in review | H; keypad slower than recall |
| Stufe suggestion | Stufe 1 | **Stufe 1 for a new skill**; content may be new this year | Stufe 2 | 2.3; H |
| Core loop, hints | §6.1 in [45] | Stays. Worked steps at most 4 lines on Stufe 1. | Answer, hint, second try, worked steps, Zwillingsaufgabe | L4, L6, G12 |
| Mastery | Geübt, Sicher, Gemeistert | Stays, including the spaced check. | Same | L8 (heuristic) |
| Choice items | ≤ 4, ≤ 6 on Stufe 3 | **≤ 4 on Stufe 1, ≤ 6 on Stufe 2–3.** `order` ≤ 6, `multi` ≤ 4 | ≤ 8 | H |
| Order and drag | Tap only | Tap only. | Tap and keyboard | G14; P17 |
| Text | Section 4 in [46] | Section 4. **Antwortsatz via `before`/`after`** around a number field; no word chips. | 3–4 lines; word chips | G10; H |
| Read-aloud | Button in every task | **Button in every task** when a local German voice exists; never autoplay; hidden otherwise. | Optional | G10; F11; P12 |
| Warm-up | 3 items, 5 reviews a day | **3 items, 6 reviews a day** | 3–5 items, 8 reviews a day | H |
| Break prompt | After 15 min | **After 20 min** | After 20 min | G13; H |
| Fehlerdetektiv | Stufe 3 or after Sicher | Stays, focused on `schriftlich`. | Same | L6; [2][8] |
| Einmaleins | 40 Kern facts, 6 optional squares | **100 · facts and 90 : facts tracked**; never row by row | 100 + 90 | 2.2 |
| Subtraction method | None | **Setting Abziehen, Ergänzen; default Abziehen; asked once before the first minus skill; never mixed** | Same setting | C7; 2.3 |
| Rest | Optional | **Two fields, "Rest" written out, Probe line** | "4 R 3" with Probe | G6 |
| Number display | Up to 100 | ≤ 1000 ungrouped; "2500 m" ungrouped | Narrow spaces from 5 digits | C11 |
| Länder options | Optional skills marked "Extra" | Same. "Extra" never counts toward topic progress. The adult page explains differences. | NRW extras | 2.3 |
| Worksheets, adult page, phrase rotation, badges | Per [45] | Stay, with Klasse-3 wording. | M7, M14 | |
| Privacy, security, performance | No change | No change. Storage key `mathe3.v1`. | P1–P6, P14–P15 | Section 3 |

### 7.2 Banned patterns (equivalent of Klasse 4 §6.4)

**This section is what code, tests and reviews mean when they cite "docs/research.md §6.4".** It is part of code review. The list is copied from [45] §6.4; Radesky et al. [50] show why it is needed.

- Praise for traits or speed, and superlatives (see M15 in 7.4).
- "Falsch!", "Leider falsch.", "Schon wieder falsch.", "Das war doch einfach!", "Konzentrier dich!", "Alle anderen schaffen das."
- A red X, a buzzer, alarm red for errors, or feedback shown by colour alone.
- Timers or countdowns by default, and "Zu langsam!" or "Schneller!".
- Leaderboards, rankings, percentiles or participation badges.
- Currency, a shop, loot or mystery boxes, random bonus stars, or rewards announced before a task.
- Consecutive-day streaks, and messages about losing anything ("Serie verloren", "0 Tage").
- Push notifications, reminders or e-mail.
- A mascot that guilt-trips on exit, a hidden or delayed exit button, autoplay into the next round, or pop-ups during a round.
- Any third-party request: fonts, CDNs, analytics, embeds or external images.
- Storage writes before opt-in, and cookies.
- Free-text inputs and fields for personal data.
- `type="number"` inputs, and drag-only interactions.

Added for Klasse 3: reciting Einmaleins rows as a task format; a timed Einmaleins test, in any wording; mixing Abziehen and Ergänzen in one session; marking a method as the "right" one. Accessibility targets stay at WCAG 2.2 AA plus the Klasse-4 AAA criteria [44].

### 7.3 Round length: recommendation

**Default 10 items (target about 12–16 minutes), 8 items in `schriftlich`. A heuristic.** Reasoning: attention develops to about 8–9 years and then plateaus [39]; the homework frame is the same as in Klasse 4 (45 minutes) [40]; VERA-3 works at about 1.4–1.6 minutes per item under test conditions [25], which gives about 16 minutes for 10 items and 13 for 8, and practice items should mostly be shorter. A written item costs several cells plus carries, so a shorter round there keeps its length similar. We found no experiment on round length for 8–9-year-olds, and the time estimate is our own. Measure it in the pilot.

AB mix: **10 items: Stufe 1: 6/3/1, Stufe 2: 4/4/2, Stufe 3: 2/5/3.** **8 items: Stufe 1: 5/2/1, Stufe 2: 3/3/2, Stufe 3: 2/4/2** (AB I/II/III). "At least one harder item per round" stays [1]. The 3-item Einstiegs-Check counts inside the round.

### 7.4 M15 phrase bank (Klasse 3 wording)

Same rules as M15 in [45], which code and tests cite as "M15". Use short forms and name the action.

| Situation | Use (rotate) | Never use |
|---|---|---|
| Correct | "Richtig! Du hast an den Übertrag gedacht." · "Stimmt! Du hast den Hunderter gewechselt." · "Richtig! Du hast zuerst überschlagen." · "Stimmt! Du hast die Null mitgezählt." | "Du bist so schlau!" · "Du bist ein Mathe-Genie!" · "Du bist ein Naturtalent!" · "Du warst so schnell!" · "PERFEKT!" · "Unglaublich!" · "Fantastisch!" · "Weltklasse!" |
| 1st wrong attempt | "Noch nicht ganz. Probier es noch einmal." · "Fast! Schau noch einmal auf die Zehnerspalte." | "Falsch!" · "Leider falsch." · "Konzentrier dich!" |
| 2nd wrong attempt | "Schauen wir es zusammen an." · "So kannst du rechnen: …" | "Schon wieder falsch." · "Das war doch einfach!" · "Alle anderen schaffen das." |
| Normalising (at most once per session) | "Fehler helfen beim Lernen." · "Das lernst du gerade." | "Dein Gehirn wächst bei jedem Fehler." |
| Round summary | "8 von 10 geschafft. 2 Aufgaben waren noch knifflig." | "2 Fehler!" · "Nicht bestanden" |
| Improvement (M16) | "Minus mit Übertrag, Stufe 1: Am Anfang 3 von 10 auf Anhieb, jetzt 8 von 10." · "Du hast den Übertrag jetzt fünfmal richtig beachtet." Words-only variant: "Das hat vor ein paar Tagen noch nicht geklappt. Heute schon." | "Endlich!" · "Na also!" · "Viel besser!" · "Besser als die anderen" · "Jetzt machst du keine Fehler mehr" |
| Speed | (nothing) | "Zu langsam!" · "Schneller!" |
| Leaving or a break | "Schön, dass du geübt hast. Bis bald!" · "Gute Idee, eine Pause zu machen!" | "Willst du wirklich aufhören?" · "Dein Freund ist traurig, wenn du gehst." |
| Status labels | "Geübt" → "Sicher" → "Gemeistert" (1–3 stars with a legend) | "Serie verloren" · "Deine Serie ist in Gefahr!" · "0 Tage" |

## 8. Limitations and open questions

**Could not be verified**

- **No official Jgst. 3 content for Bayern.** The plan and the "Grundlegende Kompetenzen" page cover 3/4 together [2][3]. Bayern's Klasse-3 placement here rests on one 2015 textbook manual [5], searched in its text layer only, so content inside images would be missed. "Not found" for written ·, written : and ml means exactly that. ISB's newsletter 2017/06 on Rechenverfahren and the "Lernausgangslage ZR 1000" sheets appeared in search but returned 404, so they are not used.
- **No official Klasse-3 placement for NRW.** We read one mixed-age school plan [16] and material filed under Klasse 3 [17][18][19]. A QUA-LiS example Arbeitsplan could not be found, the old schulentwicklung.nrw.de links redirect, and the one single-grade plan (Stephanusschule Paderborn) timed out twice. A publisher's NRW plan was not found.
- **BW Klasse-3 placement** rests on an undated Westermann plan with older wording [15]. It does not reflect V2.
- **No verified words-per-minute norm for Klasse 3.** [27] reports list scores from one school, and 100 wpm is a general rule of thumb [28][29]. Published test norms (ELFE, SLRT) were not opened.
- **Sources not opened**, so not relied on: Burny, Valcke & Desoete on clock reading (publisher and CORE blocked; search listings only); Heckmann on Euro, Cent and decimals (not found); the VERA-3 Größen handout on the NRW server (redirected). Winarti et al. [26] was seen only as an abstract in a search listing, because the journal link redirected.
- **Bugs marked H have no source showing them as Klasse-3 errors.** That includes all rounding bugs, clock bugs, `ergaenzen-1000` and `km-100`. Their frequency is unknown. L14 in [45] also found no strong base on rounding misconceptions.
- **Carried-over sources** ([1][4][29]–[37][39]–[44][47]–[55]): figures rely on the reading in [45] or [46]; not re-read here.
- **The Sachsen cover** lists "2025/2026" and the state's list mentions an "Anpassung 2026", while page footers say 2025 [9]. We did not find what a 2026 change contains. Sachsen-Anhalt's plan dated 1 August 2026 was not opened.
- **BE-BB's plan** was read in a copy hosted by a school [12].

**Weak spots in the evidence**

- VERA figures are from one Land, measure Klasse-4 standards, and describe tests, not practice [25].
- G1 rests on three schools; G5 on 71 children and a verification task, not typed production; G9 on one abstract from another country.
- Nearly all feedback and retrieval evidence comes from older learners.
- All numeric limits in section 4 and all thresholds in 7.1 and 7.3 are heuristics. A pilot with a few children should check: time per item, reading trouble by word, use of Vorlesen, whether 10 items feel long, written-cell error rate at 56 px, and how fast Einmaleins facts reach Sicher.

**Curriculum questions**

- Only five Länder were read. Others may differ.
- `opt` for parallel/senkrecht and `core` for `zahlen.runden` are judgement calls. Teachers may disagree.
- Automatisation is tracked by spaced first-try accuracy only, since v1 uses no times. A child may reach Gemeistert while still deriving facts. This is a deliberate trade-off (G16), and it should be stated on the adult page.
- Written methods arrive late in the year in some plans. Consider a topic note: "Noch nicht in der Schule? Das ist okay."
- Sums stay ≤ 1000, so the `leerstelle` case occurs rarely. Consider allowing it as Knobel only.

**Legal question**

The Klasse-4 storage opt-in addresses the child (P1). Whether an 8-year-old understands it should be part of the legal review before launch, with "Frag einen Erwachsenen" as a candidate addition. This does not change the analysis that no personal data is collected.

**Code note**

Source comments in the sibling repositories cite IDs such as L8, M16 or P13. These live in [45]; only §6.4 and M15 are restated here (7.2, 7.4).

## 9. Sources

All accessed 2026-11-03. Sources were opened unless marked. *Abstract* or *summary* means only that part was seen. *Carried over* means read for [45] or [46]; relied on through those documents.

1. KMK (2022). Bildungsstandards für das Fach Mathematik Primarbereich (Beschluss vom 15.10.2004, i. d. F. vom 23.06.2022). *Carried over.* https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-Primarbereich-Mathe.pdf
2. ISB Bayern. LehrplanPLUS Grundschule, Mathematik 3/4, Fachlehrplan. https://www.lehrplanplus.bayern.de/fachlehrplan/grundschule/3/mathematik
3. ISB Bayern. LehrplanPLUS, Grundlegende Kompetenzen zum Ende der Jahrgangsstufe 4 (Jgst. 3, 4). https://www.lehrplanplus.bayern.de/jahrgangsstufenprofil/grundschule/3
4. ISB Bayern. LehrplanPLUS Grundschule, Mathematik 1/2, Fachlehrplan. *Carried over.* https://www.lehrplanplus.bayern.de/fachlehrplan/grundschule/1/mathematik
5. Cornelsen (2015). Zahlenzauber 3, Lehrermaterialien, Ausgabe Bayern (written to LehrplanPLUS). https://www.cornelsen.de/_Resources/Persistent/8/e/3/2/8e324ff358b8d59233a112d89671aa5dcc0db959/Zahlenzauber_Ausgabe_BY_Klasse_3.pdf
6. MSB NRW (2021). Lehrpläne für die Primarstufe (Sammelband; Mathematik from p. 72, expectations pp. 85–94, Deutsch "Lesen" pp. 23–24). https://lehrplannavigator.nrw.de/system/files/media/document/file/ps_lp_sammelband_2021_08_02.pdf
7. Baden-Württemberg. Implementierungskonzept überarbeiteter Pläne (table for Mathematik: V2 of 29.02.2024 for all Klassen in 2026/27). https://bildungsplaene-bw.de/25863460
8. Baden-Württemberg. Bildungsplan 2016 V2, Grundschule, Mathematik, Klassen 3/4, sections 3.2.1.1–3.2.4.2. https://www.bildungsplaene-bw.de/,Lde/BP2016BW_ALLG_GS_M.V2_IK_3-4_01_02 (same pattern for `_01_01`, `_01_03`, `_02_01`–`_02_04`, `_03_01`, `_03_02`, `_04_01`, `_04_02`)
9. Sachsen, Landesamt für Schule und Bildung. Lehrplan Grundschule Mathematik (2004/2009/2019/2025/2026; in force 1 August 2025), Klassenstufe 3, pp. 19–27. https://www.schulportal.sachsen.de/lplandb/lehrplan/file/912/Mpk0iAibe4ONjV3PndYR
10. Sachsen. Jahrgangsübergreifender Unterricht: Parallelisierung der Fachinhalte in der Klassenstufe 3/4 (based on the 2019 plan). https://www.sachsen.schule/~lasub-stor/jueu/media/teil_3_materialien_mathematik_-_fachdidaktische_einblicke_uebersicht-parallelisierung-fachinhalte-lehrplan_klassenstufe_3_und_4.pdf
11. Klett. Nussknacker 3, Synopse zum Lehrplan für Sachsen (2026 file). https://assets.klett.de/assets/4f226ef8cb9610f2ab39da1c154729f9c1c13161d67d3575584662abad173f36/Nussknacker_2021_Klasse3_Synopse_SN_2026.docx
12. LISUM (2023). Rahmenlehrplan Berlin-Brandenburg, Teil C Mathematik, Jg. 1–10 (copy hosted by a school). https://hcg-berlin.de/wp-content/uploads/rahmenlehrplan-teil-c_mathe-1-10.pdf
13. LISUM (2024). Planungshilfe für einen kompetenzorientierten Mathematikunterricht, Jahrgangsstufe 3. https://bildungsserver.berlin-brandenburg.de/fileadmin/bbb/unterricht/faecher/naturwissenschaften/mathematik/Planungshilfen_kompetenzorientierter_Unterricht/Grundschule/Jahrgangsstufe_3_Planungshilfe_fuer_den_MU.pdf
14. Klett. Nussknacker 3, Stoffverteilungsplan Berlin, Brandenburg, Bremen, Mecklenburg-Vorpommern. https://asset.klett.de/assets/b25ace39/NK_Stoff_BE_BB_HB_MV_3.pdf
15. Westermann. Stoffverteilungsplan Klasse 3, Baden-Württemberg (undated; older wording). https://c.wgr.de/d/695deb4db789cd807bf75432cae8af98e266e825eb43cc9459242cf11b8336fe.pdf/191403_stoffverteilungsplan3_bw.pdf
16. GS Büttenberg. Schulinterner Arbeitsplan Mathematik (NRW; jahrgangsübergreifend). https://nrw.edumaps.de/file/15558843191562884385.pdf/oh41nme
17. SchuMaS, on PIKAS (2023). Schriftliche Addition, Handreichung zur Praxiserprobung (Kl. 3). https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_12_schumas3_4/Fachnetzwerktreffen5/praxiserpobung2.5_handreichung_kl._3.pdf
18. PIKAS (2022). Handreichung zur Standortbestimmung: Geschickte Addition, Zahlraum bis 1000. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/diagnose_und_foerderung/klasse3/hr_zr1000_addition_flexible_addition_220823.pdf
19. PIKAS (2022). Handreichung zur Standortbestimmung: Geschickte Subtraktion, Zahlraum bis 1000. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/diagnose_und_foerderung/klasse3/hr_zr1000_subtraktion_flexible_subtraktion_220823.pdf
20. KIRA, DZLM. Schriftliche Addition: Schwierigkeiten und Fehler. https://kira.dzlm.de/arithmetik-im-3-und-4-schuljahr/schriftliche-addition/schriftliche-addition-schwierigkeiten-und
21. KIRA, DZLM. Schriftliche Subtraktion: typische Fehler. https://kira.dzlm.de/arithmetik-im-3-und-4-schuljahr/typische-fehler-bei-der-schriftlichen-subtraktion
22. PIKAS (2010). Typische Fehler bei der schriftlichen Subtraktion: eine Übersicht. https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_9_-_Leistungen_wahrnehmen/FM/Modul_9.2/Teilnehmer-Material/InfoAufg_TM_typische_Fehler_Subtraktion.pdf
23. Herzog, M., & Fritz, A. (2022). Place value understanding explains individual differences in writing numbers in second and third graders but goes beyond. *Frontiers in Education, 6*, 642153. https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.642153/pdf
24. Soltanlou, M., Pixner, S., & Nuerk, H.-C. (2015). Contribution of working memory in multiplication fact network in children may shift from verbal to visuo-spatial. *Frontiers in Psychology, 6*, 1062. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01062/pdf
25. LISA Sachsen-Anhalt (2025). VERA-3 Mathematik: Landesergebnisse 2024/25. https://www.bildung-lsa.de/files/74b52d018c4021321c03b3d0e1a7e49a/VERA3_MAT_250813_final.pdf
26. Winarti, D. W., Amin, S. M., Lukito, A., & Van Galen, F. (2012). Learning the concept of area and perimeter by exploring their relation. *Journal on Mathematics Education, 3*(1), 41–54. *Abstract, via search listing.* https://ejournal.unsri.ac.id/index.php/jme/article/view/616
27. Jungjohann, J., Schurig, M., & Gebhardt, M. (2021). Pilotierung von Leseflüssigkeits- und Leseverständnistests im Längsschnitt. https://epub.uni-regensburg.de/45049/1/2021_Jungjohann%20Schurig%20Gebhardt_Pilotierung%20LVD%20Lesefl%C3%BCssigkeit-%20und%20Leseverst%C3%A4ndnistests%20im%20L%C3%A4ngsschnitt.pdf
28. Save the Children. Exkurs: Zur Bedeutung der Leseflüssigkeit (practitioner note). https://www.savethechildren.de/fileadmin/user_upload/Downloads_Dokumente/Deutsche_Programme/Leseoasen/Wettbewerb/Exkurs._Zur_Bedeutung_der_Lesefl%C3%BCssigkeit..pdf
29. Lautleseprotokoll (description of Rosebrock, Nix, Rieckmann & Gold, *Leseflüssigkeit fördern*). *Carried over, summary.* https://sprachelesen.vobs.at/fileadmin/material/leseroute/diagnose/Lautleseprotokoll.pdf
30. DZLM (2022). Stellenwertverständnis, Fortbildungsmaterial. *Carried over.* https://maco.dzlm.de/sites/maco/files/material-lul/dzlm_maco_prim_stellenwert_220712.pdf
31. PIKAS (2010). 1·1 richtig üben, Basisinfos. *Carried over.* https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/Haus_3_-_Umgang_mit_Rechenschwierigkeiten/UM/1x1_richtig_ueben/Basisinfos/basisinfos_1x1_ueben.pdf
32. PIKAS (2021). Handreichung zur Standortbestimmung: Schnelles Kopfrechnen, Sicher im 1·1 (2./3. Schuljahr). *Carried over.* https://pikas.dzlm.de/pikasfiles/uploads/upload/Material/diagnose_und_foerderung/klasse2/handreichung_jg2_schnelles_kopfrechnen_1x1.pdf
33. Daroczy, G., Wolska, M., Meurers, W. D., & Nuerk, H.-C. (2015). Word problems: a review of linguistic and numerical factors contributing to their difficulty. *Frontiers in Psychology, 6*, 348. *Carried over.* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00348/pdf
34. Vessonen, T., Hellstrand, H., Aunio, P., & Laine, A. (2026). Pictures in mathematical word problems. *Educational Psychology Review, 38*(1). *Carried over, abstract.* https://research.abo.fi/en/publications/pictures-in-mathematical-word-problems-a-systematic-review-on-the/
35. Buzick, H., & Stone, E. (2014). A meta-analysis of research on the read aloud accommodation. *Carried over, summary.* https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/527e5ed2-1fd9-4abb-97fe-a9e7f93978d9
36. Katzir, T., Hershko, S., & Halamish, V. (2013). The effect of font size on reading comprehension on second and fifth grade children. *PLoS ONE, 8*(9). *Carried over, abstract.* https://pmc.ncbi.nlm.nih.gov/articles/PMC3777945/
37. Wilkins, A., Cleave, R., Grayson, N., & Wilson, L. (2009). Typography for children may be inappropriately designed. *Journal of Research in Reading, 32*(4). *Carried over.* https://repository.essex.ac.uk/1476/
38. Fyfe, E. R., & Rittle-Johnson, B. (2015). Feedback both helps and hinders learning. *Journal of Educational Psychology.* *Carried over.* https://news.vanderbilt.edu/files/FyfeRittleJohnson2015_JEP.pdf
39. Betts, J., McKay, J., Maruff, P., & Anderson, V. (2006). The development of sustained attention in children. *Child Neuropsychology, 12*. *Carried over, abstract.* https://www.cogstate.com/publication/the-development-of-sustained-attention-in-children-the-effect-of-age-and-task-load/
40. Ministerium für Schule und Bildung NRW. Hausaufgaben. *Carried over.* https://www.schulministerium.nrw/hausaufgaben
41. Anthony, L., et al. (2013). Designing smarter touch-based interfaces for educational contexts. *Carried over.* https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf
42. Brown, Q., & Anthony, L. (2012). Toward comparing the touchscreen interaction patterns of kids and adults. *Carried over.* https://lisa-anthony.com/wp-content/uploads/2012/03/brown-and-anthony-chi2012eist.pdf
43. Liu, F. (2018). Design for kids based on their stage of physical development. Nielsen Norman Group. *Carried over.* https://www.nngroup.com/articles/children-ux-physical-development/
44. W3C. Web Content Accessibility Guidelines (WCAG) 2.2. *Carried over.* https://www.w3.org/TR/WCAG22/
45. Mathe 4 (2026). Research summary: Mathe-Portal Klasse 4. https://github.com/lev-n/mathe-4/blob/main/docs/research.md
46. Mathe 2 (2026). Research summary: Mathe-Portal Klasse 2. Sibling repository, `docs/research.md` (read locally).
47. Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Carried over.* https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
48. Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2013). Math anxiety, working memory, and math achievement in early elementary school (news release). *Carried over.* https://news.uchicago.edu/story/math-anxiety-causes-trouble-students-early-first-grade
49. Caviola, S., Carey, E., Mammarella, I. C., & Szucs, D. (2017). Stress, time pressure, strategy selection and math anxiety in mathematics. *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC5585192
50. Radesky, J., et al. (2022). Prevalence and characteristics of manipulative design in mobile applications used by children. *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/
51. Art. 8 DSGVO. *Carried over.* https://dsgvo-gesetz.de/art-8-dsgvo/
52. Wissenschaftliche Dienste des Deutschen Bundestages (2023). WD 10 – 019/23. *Carried over.* https://www.bundestag.de/resource/blob/959324/WD-10-019-23-pdf.pdf
53. Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021). Testing (quizzing) boosts classroom learning. *Carried over.* https://gwern.net/docs/spacedrepetition/2021-yang.pdf
54. Rothera, S. A. (1989). An examination of how children read the time. Masters thesis, Durham University. *Carried over, abstract.* https://etheses.durham.ac.uk/id/eprint/6561
55. Grassmann, M., et al. (2008). Kinder wissen viel – auch über die Größe Geld? Teil 3. Potsdamer Studien zur Grundschulforschung 34. *Carried over.* https://publishup.uni-potsdam.de/files/1523/psgsf34.pdf
