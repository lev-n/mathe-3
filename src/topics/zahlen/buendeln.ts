/**
 * zahlen.buendeln: base-ten pictures, ten of a place make one of the next place, and back (docs/research.md §6). The Stellenwerttafel
 * writes the same picture as digits, and a cell above 9 shows what bundling still has to do.
 *
 * The Stufe decides the content: Stufe 1 reads pictures without bundling, Stufe 2 bundles upwards, Stufe 3 unbundles and looks for the fewest blocks.
 */
import { BOX, toSpeech } from '../../core/format';
import type { Ab, Exercise, PlaceColumn, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, joinDe, makeChoice, multiBugs, numberBugs, plural } from '../shared';
import { STELLE_WORT, ausFormen, material, ohneNullen, stellen, tafel, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.buendeln', topicId: 'zahlen' } as const;
const KMK = ['ZO.stellenwert', 'PK.darstellen'];

const platten = (n: number) => `${n} ${plural(n, 'Hunderterplatte', 'Hunderterplatten')}`;
const stangen = (n: number) => `${n} ${plural(n, 'Zehnerstange', 'Zehnerstangen')}`;
const wuerfel = (n: number) => `${n} Einerwürfel`;

/** '3 H 14 Z 5 E', without a place that has nothing. */
function kurz(h: number, z: number, e: number): string {
  return [h ? `${h} H` : '', z ? `${z} Z` : '', e ? `${e} E` : ''].filter(Boolean).join(' ');
}

/** H and Z before bundling, and after it when given. */
function tafelHZ(...zeilen: [number, number][]): VisualOf<'placeValue'> {
  return { type: 'placeValue', columns: ['H', 'Z'], rows: zeilen.map((values) => ({ values })) };
}

// ─── Stufe 1: picture to number, no bundling ─────────────────────────────────

function bildAufgabe(n: number, stufe: Stufe, ab: Ab): Exercise {
  const { h, z, e } = stellen(n);
  const leer = z === 0 ? 'Stangen' : e === 0 ? 'Würfel' : null;
  return build(SKILL, stufe, {
    key: `bild:${n}`,
    ab,
    prompt: 'Welche Zahl zeigt das Material?',
    visual: material(n),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Eine Platte sind 100. Eine Stange sind 10.', leer ? `Keine ${leer}? Dann steht an dieser Stelle eine 0.` : 'Zähle erst die Platten, dann die Stangen, dann die Würfel.'],
    steps: [`${platten(h)}: Das sind ${h * 100}.`, ...(z ? [`${stangen(z)}: Das sind ${z * 10}.`] : []), ...(e ? [`${wuerfel(e)}: Das sind ${e}.`] : []), { text: `${[h * 100, ...(z ? [z * 10] : []), ...(e ? [e] : [])].join(' + ')} = ${n}`, visual: tafel(n) }],
    bugs: numberBugs(
      [
        { id: 'teile-gezaehlt', match: h + z + e, hint: 'Jedes Teil zählt anders: Eine Platte sind 100, eine Stange sind 10.' },
        { id: 'zahlendreher', match: zahl(h, e, z), hint: 'Die Stangen sind die Zehner. Die Würfel sind die Einer.' },
        { id: 'stellen-reihenfolge', match: zahl(e, z, h), hint: 'Die Hunderter stehen vorne. Schau zuerst auf die Platten.' },
      ],
      n,
    ),
    praise: leer ? `Du hast die 0 bei den ${leer === 'Stangen' ? 'Zehnern' : 'Einern'} mitgedacht.` : 'Du hast Platten, Stangen und Würfel richtig gelesen.',
    // only the pieces on screen: a place that says 0 here would tell a screen-reader user more than the task shows
    srText: `Rechenmaterial: ${joinDe([platten(h), ...(z ? [stangen(z)] : []), ...(e ? [wuerfel(e)] : [])])}. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

const bildZuZahl: Form = (rng, stufe, ab) => bildAufgabe(ohneNullen(rng), stufe, ab);

/** A picture without sticks or without cubes: the empty place is the difficulty. */
const bildMitLuecke: Form = (rng, stufe, ab) => bildAufgabe(rng.chance(0.65) ? zahl(rng.int(1, 9), 0, rng.int(1, 9)) : zahl(rng.int(1, 9), rng.int(1, 9), 0), stufe, ab);

function bildZuStellen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ohneNullen(rng);
  const { h, z, e } = stellen(n);
  const fields = [
    { id: 'h', value: h, after: 'Hunderter', label: 'Hunderter' },
    { id: 'z', value: z, after: 'Zehner', label: 'Zehner' },
    { id: 'e', value: e, after: 'Einer', label: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `stellen:${n}`,
    ab,
    prompt: 'Wie viele Hunderter, Zehner und Einer zeigt das Material?',
    visual: material(n),
    answer: { kind: 'multi', fields },
    hints: ['Jede Platte ist ein Hunderter. Jede Stange ist ein Zehner.', 'Jeder kleine Würfel ist ein Einer.'],
    steps: [`${platten(h)}: ${h} H`, `${stangen(z)}: ${z} Z`, `${wuerfel(e)}: ${e} E`, { text: `Also: ${h} Hunderter, ${z} Zehner und ${e} Einer.`, visual: tafel(n) }],
    bugs: multiBugs([{ id: 'zahlendreher', match: { z: e, e: z }, hint: 'Die Stangen sind die Zehner. Die Würfel sind die Einer.' }], fields),
    praise: 'Du hast jedes Teil der richtigen Stelle zugeordnet.',
    srText: `Rechenmaterial: ${platten(h)}, ${stangen(z)} und ${wuerfel(e)}. Wie viele Hunderter, Zehner und Einer sind das?`,
    kmk: KMK,
  });
}

function zahlZuBild(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // On a phone the options stand one below the other. 1 or 2 plates keep a picture at 134 px at most (3 would add a row of sticks), and 3 options, not 4.
  const h = rng.int(1, 2);
  const z = rng.int(1, 5);
  const e = rng.pick([1, 2, 3, 4, 5].filter((x) => x !== z));
  const n = zahl(h, z, e);
  const [right, ...others] = rng.shuffle(['A', 'B', 'C']);
  const answer = makeChoice(
    rng,
    { label: right, visual: material(n) },
    [
      { label: others[0], visual: material(zahl(h, e, z)), whyWrong: 'Zähle die Stangen: Das sind die Zehner.' },
      { label: others[1], visual: material(zahl(3 - h, z, e)), whyWrong: 'Zähle die Platten: Das sind die Hunderter.' },
    ],
    { layout: 'grid', order: ['A', 'B', 'C'] },
  );
  return build(SKILL, stufe, {
    key: `bildwahl:${n}`,
    ab,
    prompt: `Welches Bild zeigt ${n}?`,
    answer,
    hints: [`Wie viele Hunderter hat ${n}? So viele Platten suchst du.`, 'Prüfe dann die Stangen und die Würfel.'],
    steps: [{ text: `${n} = ${h * 100} + ${z * 10} + ${e}`, visual: tafel(n) }, `Das sind ${platten(h)}, ${stangen(z)} und ${wuerfel(e)}.`, `Das zeigt Bild ${right}.`],
    praise: 'Du hast die Teile mit den Stellen der Zahl verglichen.',
    srText: `Welches Bild zeigt ${n}?`,
    kmk: KMK,
  });
}

// ─── Stufe 2: ten of a place make one of the next place ──────────────────────

/** The rule as an equation: upwards (bundling, Stufe 2), or downwards (unbundling, Stufe 3). */
const regel = (buendeln: boolean): Form => (rng, stufe, ab) => {
  const [klein, gross] = rng.pick<[PlaceColumn, PlaceColumn]>([['Z', 'H'], ['Z', 'H'], ['E', 'Z'], ['H', 'T']]);
  const tausender = gross === 'T';
  const k = tausender ? 1 : rng.int(1, 9);
  const kleinWort = STELLE_WORT[klein];
  const grossWort = STELLE_WORT[gross];
  const value = buendeln ? k : k * 10;
  const expression = buendeln ? `${k * 10} ${kleinWort} = ${BOX} ${grossWort}` : `${k} ${grossWort} = ${BOX} ${kleinWort}`;
  // with k = 1 the rule is the task itself ('10 Hunderter = □ Tausender', '1 Hunderter = □ Zehner'): a hint must not state it
  const regelText = k > 1 ? `10 ${kleinWort} sind 1 ${grossWort}.` : buendeln ? `Immer 10 ${kleinWort} bilden ein Bündel.` : `Ein Bündel ${kleinWort} ergibt einen ${grossWort}.`;
  const zweiterHint = buendeln ? 'Wie viele Bündel sind es?' : k > 1 ? `Rechne für ${k} ${grossWort}.` : `Wie viele ${kleinWort} sind in dem Bündel?`;
  return build(SKILL, stufe, {
    key: `regel:${expression}`,
    ab,
    prompt: buendeln ? 'Bündle. Wie viele sind es?' : 'Tausche. Wie viele sind es?',
    expression,
    answer: { kind: 'number', value, label: buendeln ? grossWort : kleinWort },
    hints: [regelText, zweiterHint],
    steps: [`10 ${klein} = 1 ${gross}`, buendeln ? `${k * 10} ${klein} sind ${k}-mal 10 ${klein}.` : `${k} ${gross} sind ${k}-mal 10 ${klein}.`, buendeln ? `Also: ${k * 10} ${klein} = ${k} ${gross}` : `Also: ${k} ${gross} = ${k * 10} ${klein}`],
    bugs: numberBugs(
      buendeln
        ? [
            { id: 'buendeln', match: k * 10, hint: `${regelText} Bündle zuerst.` },
            { id: 'buendeln', match: k * 100, hint: `${regelText} Bündle zuerst.` },
          ]
        : [
            { id: 'nicht-getauscht', match: k, hint: `Jeder ${grossWort} ist ein ganzes Bündel ${kleinWort}.` },
            { id: 'nicht-getauscht', match: k * 100, hint: `Jeder ${grossWort} ist nur ein Bündel ${kleinWort}.` },
          ],
      value,
    ),
    praise: buendeln ? 'Du hast immer 10 zu einem Bündel gemacht.' : 'Du hast das Bündel wieder aufgemacht.',
    srText: toSpeech(expression),
    kmk: KMK,
  });
};

/** 3 H 14 Z or 3 H 2 Z 14 E: exactly one place holds more than 9. */
function gemischt(rng: Rng): { h: number; z: number; e: number; zuViel: 'Z' | 'E' } {
  if (rng.chance(0.7)) return { h: rng.int(1, 8), z: rng.int(10, 19), e: rng.chance(0.5) ? 0 : rng.int(1, 9), zuViel: 'Z' };
  return { h: rng.int(1, 9), z: rng.int(0, 8), e: rng.int(10, 19), zuViel: 'E' };
}

function gemischtZuZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { h, z, e, zuViel } = gemischt(rng);
  const n = zahl(h, z, e);
  const istZ = zuViel === 'Z';
  const expression = `${kurz(h, z, e)} = ${BOX}`;
  const b = stellen(n);
  const tafeln: VisualOf<'placeValue'> = { type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values: [h, z, e] }, { values: [b.h, b.z, b.e] }] };
  return build(SKILL, stufe, {
    key: `gemischt:${h}:${z}:${e}`,
    ab,
    prompt: 'Bündle zuerst. Welche Zahl ist das?',
    expression,
    visual: { type: 'baseTen', hundreds: h, tens: z, ones: e },
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: [istZ ? '10 Zehner sind 1 Hunderter.' : '10 Einer sind 1 Zehner.', 'Bündle zuerst. Schreib dann Hunderter, Zehner und Einer.'],
    steps: istZ
      ? [`${z} Z = 10 Z + ${z - 10} Z`, '10 Z = 1 H', `${h} H + 1 H = ${h + 1} H`, { text: `${kurz(h + 1, z - 10, e)} = ${n}`, visual: tafeln }]
      : [`${e} E = 10 E + ${e - 10} E`, '10 E = 1 Z', `${z} Z + 1 Z = ${z + 1} Z`, { text: `${kurz(h, z + 1, e - 10)} = ${n}`, visual: tafeln }],
    bugs: numberBugs(
      [
        { id: 'buendeln', match: Number(`${h}${z}${e}`), hint: istZ ? '10 Zehner sind 1 Hunderter. Bündle zuerst.' : '10 Einer sind 1 Zehner. Bündle zuerst.' },
        { id: 'nicht-gebuendelt', match: istZ ? zahl(h, z - 10, e) : zahl(h, z, e - 10), hint: istZ ? 'Das Zehnerbündel fehlt. Das Bündel kommt als Hunderter dazu.' : 'Das Einerbündel fehlt. Das Bündel kommt als Zehner dazu.' },
      ],
      n,
    ),
    praise: istZ ? 'Du hast die Zehner zu einem Hunderter gebündelt.' : 'Du hast die Einer zu einem Zehner gebündelt.',
    // only the places on screen: a place that says 0 here would tell a screen-reader user more than the task shows
    srText: `${joinDe([`${h} Hunderter`, ...(z ? [`${z} Zehner`] : []), ...(e ? [`${e} Einer`] : [])])}. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

function buendelnMulti(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 8);
  const z = rng.int(10, 19);
  const fields = [
    { id: 'h', value: h + 1, after: 'Hunderter', label: 'Hunderter' },
    { id: 'z', value: z - 10, after: 'Zehner', label: 'Zehner' },
  ];
  return build(SKILL, stufe, {
    key: `multi:${h}:${z}`,
    ab,
    prompt: 'Bündle die Zehner. Wie viele Hunderter und Zehner sind es dann?',
    expression: `${h} H ${z} Z`,
    visual: tafelHZ([h, z]),
    answer: { kind: 'multi', fields },
    hints: ['10 Zehner sind 1 Hunderter.', 'Der neue Hunderter kommt zu den anderen Hundertern.'],
    steps: [`${z} Z = 10 Z + ${z - 10} Z`, '10 Z = 1 H', { text: `Also: ${h + 1} Hunderter und ${z - 10} Zehner.`, visual: tafelHZ([h, z], [h + 1, z - 10]) }],
    bugs: multiBugs(
      [
        { id: 'nicht-gebuendelt', match: { h, z }, hint: 'Hier stehen mehr als 9 Zehner. Bündle zuerst.' },
        { id: 'nicht-gebuendelt', match: { h, z: z - 10 }, hint: 'Das Zehnerbündel fehlt. Das Bündel kommt als Hunderter dazu.' },
      ],
      fields,
    ),
    praise: 'Du hast die Zehner gebündelt und den Hunderter dazugezählt.',
    srText: `${h} Hunderter und ${z} Zehner. Bündle die Zehner.`,
    kmk: KMK,
  });
}

/** 2 H 13 Z 15 E: two places hold more than 9, and the bundle of Einer makes the Zehner one more. */
function doppeltGebuendelt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 7);
  const z = rng.int(10, 18);
  const e = rng.int(10, 19);
  const n = zahl(h, z, e);
  const b = stellen(n);
  return build(SKILL, stufe, {
    key: `doppelt:${h}:${z}:${e}`,
    ab,
    prompt: 'Bündle zuerst. Welche Zahl ist das?',
    expression: `${h} H ${z} Z ${e} E = ${BOX}`,
    visual: { type: 'baseTen', hundreds: h, tens: z, ones: e },
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Bündle zuerst die Einer: 10 Einer sind 1 Zehner.', 'Bündle dann die Zehner. Der neue Zehner zählt mit.'],
    steps: [`${e} E = 1 Z ${e - 10} E`, `${z} Z + 1 Z = ${z + 1} Z`, `${z + 1} Z = 1 H ${z - 9} Z`, { text: `${kurz(h + 1, z - 9, e - 10)} = ${n}`, visual: { type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values: [h, z, e] }, { values: [b.h, b.z, b.e] }] } }],
    bugs: numberBugs(
      [
        { id: 'buendeln', match: Number(`${h}${z}${e}`), hint: 'Hier sind es mehr als 9 Zehner und mehr als 9 Einer. Bündle zuerst.' },
        { id: 'nicht-gebuendelt', match: n - 10, hint: 'Das Einerbündel fehlt. Das Bündel kommt als Zehner dazu.' },
        { id: 'nicht-gebuendelt', match: zahl(h, z - 10, e - 10), hint: 'Die Bündel fehlen. Jedes Bündel kommt zur nächsten Stelle dazu.' },
      ],
      n,
    ),
    praise: 'Du hast erst die Einer und dann die Zehner gebündelt.',
    srText: `${h} Hunderter, ${z} Zehner und ${e} Einer. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

/** □ H 14 Z = 540: the number is given, and one of its Hunderter is already in the Zehner. */
function fehlendeHunderter(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 8);
  const z = rng.int(10, 19);
  const e = rng.chance(0.5) ? 0 : rng.int(1, 9);
  const n = zahl(h, z, e);
  return build(SKILL, stufe, {
    key: `fehlt:${h}:${z}:${e}`,
    ab,
    prompt: 'Wie viele Hunderter gehören in die Lücke?',
    expression: `${BOX} H ${kurz(0, z, e)} = ${n}`,
    answer: { kind: 'number', value: h, unit: 'Hunderter', label: 'Hunderter' },
    hints: [`Bündle zuerst: ${z} Zehner sind 1 Hunderter und ${z - 10} Zehner.`, `Wie viele Hunderter hat ${n}? Einer davon steckt schon in den Zehnern.`],
    steps: [`${z} Z = 1 H ${z - 10} Z`, `${n} hat ${h + 1} H.`, `${h + 1} H − 1 H = ${h} H`, { text: `Also: ${kurz(h, z, e)} = ${n}`, visual: tafel(n) }],
    bugs: numberBugs([{ id: 'buendeln', match: h + 1, hint: 'In den Zehnern steckt noch 1 Hunderter. Bündle zuerst.' }], h),
    praise: 'Du hast an den Hunderter in den Zehnern gedacht.',
    srText: `Lücke Hunderter und ${z} Zehner${e ? ` und ${e} Einer` : ''} sind ${n}. Wie viele Hunderter gehören in die Lücke?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 3: unbundle, fewest blocks ────────────────────────────────────────

/** 300 = □ Zehner, or with Zehner of its own: 340 = □ Zehner. */
const alsZehner = (voll: boolean): Form => (rng, stufe, ab) => {
  const h = rng.int(2, 9);
  const z = voll ? 0 : rng.int(1, 9);
  const n = zahl(h, z, 0);
  const value = n / 10;
  return build(SKILL, stufe, {
    key: `alszehner:${n}`,
    ab,
    prompt: 'Wie viele Zehner sind das?',
    expression: `${n} = ${BOX} Zehner`,
    answer: { kind: 'number', value, label: 'Zehner' },
    hints: ['Auch in den Hundertern stecken Zehner.', '1 Hunderter sind 10 Zehner.'],
    steps: [{ text: `${h} H = ${h * 10} Z`, visual: tafel(n) }, ...(z ? [`${h * 10} Z + ${z} Z = ${value} Z`] : []), `Also: ${n} = ${value} Z`],
    bugs: numberBugs(
      [
        { id: 'nicht-getauscht', match: h, hint: 'Das sind nur die Hunderter. Tausche die Hunderter in Zehner.' },
        { id: 'nicht-getauscht', match: z, hint: 'Auch in den Hundertern stecken Zehner.' },
        { id: 'nicht-getauscht', match: n, hint: `${n} ist die ganze Zahl. Gefragt ist die Anzahl der Zehner.` },
      ].filter((b) => b.match > 0),
      value,
    ),
    praise: 'Du hast auch die Hunderter in Zehner getauscht.',
    srText: `${n} sind wie viele Zehner?`,
    kmk: KMK,
  });
};

/** 1000 = 3 H □ Z: the rest of the Tausender, unbundled. The plain 1000 = □ Z would be one fixed fact. */
function tausendGeteilt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const k = rng.int(1, 8);
  const rest = 1000 - k * 100;
  const value = rest / 10;
  return build(SKILL, stufe, {
    key: `tausend:${k}`,
    ab,
    prompt: 'Wie viele Zehner fehlen noch?',
    expression: `1000 = ${k} H ${BOX} Z`,
    answer: { kind: 'number', value, label: 'Zehner' },
    hints: ['Wie viele Hunderter fehlen bis 1000?', 'Tausche diese Hunderter in Zehner: 1 Hunderter sind 10 Zehner.'],
    steps: [`${k} H = ${k * 100}`, `1000 − ${k * 100} = ${rest}`, `${rest} = ${value} Z`, `Also: 1000 = ${k} H ${value} Z`],
    bugs: numberBugs(
      [
        { id: 'falsche-stelle', match: 10 - k, hint: 'Gefragt sind die Zehner, nicht die Hunderter.' },
        { id: 'nicht-getauscht', match: rest, hint: 'Das ist die Zahl. Gefragt ist die Anzahl der Zehner.' },
      ],
      value,
    ),
    praise: 'Du hast den Rest bis 1000 in Zehner getauscht.',
    srText: `1000 sind ${k} Hunderter und wie viele Zehner?`,
    kmk: KMK,
  });
}

/** Plates and sticks lie there: how many sticks are missing up to 1000? The plates have to be counted as sticks too. */
function stangenBisTausend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const k = rng.int(1, 8);
  const z = rng.int(1, 9);
  const n = zahl(k, z, 0);
  const schon = n / 10;
  const value = 100 - schon;
  return build(SKILL, stufe, {
    key: `bistausend:${n}`,
    ab,
    prompt: 'Wie viele Zehnerstangen fehlen bis 1000?',
    visual: material(n),
    answer: { kind: 'number', value, unit: 'Stangen', label: 'Stangen' },
    hints: ['1000 sind 100 Stangen.', 'Jede Platte zählt wie ein Bündel Stangen.'],
    steps: [`${platten(k)} und ${stangen(z)} sind ${n}.`, `${n} sind ${schon} Stangen.`, '1000 sind 100 Stangen.', `100 − ${schon} = ${value}`],
    bugs: numberBugs(
      [
        { id: 'platten-statt-zahl', match: 1000 - n, hint: 'Gefragt sind die Stangen, nicht die Zahl.' },
        { id: 'platten-statt-zahl', match: 10 - k, hint: 'Gefragt sind die Stangen, nicht die Platten.' },
        { id: 'nicht-getauscht', match: 100 - z, hint: 'Auch die Platten zählen mit. Tausche jede Platte in Stangen.' },
      ],
      value,
    ),
    praise: 'Du hast auch die Platten in Stangen getauscht.',
    srText: `Da liegen ${platten(k)} und ${stangen(z)}. Wie viele Zehnerstangen fehlen bis 1000?`,
    kmk: KMK,
  });
}

function wenigsteTeile(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9);
  const z = rng.int(1, 9);
  const e = rng.chance(0.5) ? 0 : rng.int(1, 5);
  const n = zahl(h, z, e);
  const value = h + z + e;
  return build(SKILL, stufe, {
    key: `wenigste:${n}`,
    ab,
    prompt: `Du legst ${n} mit möglichst wenig Teilen. Wie viele Teile sind es?`,
    answer: { kind: 'number', value, unit: 'Teile', label: 'Teile' },
    hints: ['Nimm zuerst möglichst viele Platten.', 'Nimm dann Stangen. Für den Rest bleiben Würfel.'],
    steps: [{ text: `${n} = ${h * 100} + ${z * 10}${e ? ` + ${e}` : ''}`, visual: tafel(n) }, e ? `Das sind ${platten(h)}, ${stangen(z)} und ${wuerfel(e)}.` : `Das sind ${platten(h)} und ${stangen(z)}.`, `${h} + ${z}${e ? ` + ${e}` : ''} = ${value} Teile`],
    bugs: numberBugs([{ id: 'nicht-wenigste', match: 10 * h + z + e, hint: 'Eine Platte ersetzt viele Stangen. Nimm möglichst viele Platten.' }], value),
    praise: 'Du hast zuerst die größten Teile genommen.',
    srText: `Du legst ${n} mit möglichst wenig Teilen. Wie viele Teile sind es?`,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** From a number up to 1000 with the fewest blocks: first the rest, then its blocks. */
function wenigsteBisTausend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = zahl(rng.int(1, 8), rng.int(1, 9), rng.int(1, 9));
  const rest = 1000 - n;
  const r = stellen(rest);
  const value = r.h + r.z + r.e;
  const eigene = stellen(n);
  const prompt = `Von ${n} bis 1000: Wie viele Teile brauchst du mindestens?`;
  return build(SKILL, stufe, {
    key: `wenigste1000:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value, unit: 'Teile', label: 'Teile' },
    hints: ['Rechne zuerst: Wie viel fehlt bis 1000?', 'Nimm dann zuerst Platten, dann Stangen, dann Würfel.'],
    steps: [`1000 − ${n} = ${rest}`, { text: `${rest} sind ${joinDe([platten(r.h), ...(r.z ? [stangen(r.z)] : []), wuerfel(r.e)])}.`, visual: tafel(rest) }, `${[r.h, ...(r.z ? [r.z] : []), r.e].join(' + ')} = ${value} Teile`],
    bugs: numberBugs(
      [
        { id: 'platten-statt-zahl', match: rest, hint: 'Gefragt sind die Teile, nicht die Zahl.' },
        { id: 'nicht-wenigste', match: eigene.h + eigene.z + eigene.e, hint: `Das sind die Teile von ${n}. Gesucht sind die Teile bis 1000.` },
        { id: 'nicht-wenigste', match: 30 - eigene.h - eigene.z - eigene.e, hint: 'Prüfe: Zusammen müssen es genau 1000 sein.' },
      ],
      value,
    ),
    praise: 'Du hast den Rest bis 1000 mit großen Teilen gelegt.',
    srText: prompt,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** More than 9 sticks lie there: the fewest blocks need a swap first. */
function wenigsteAusMaterial(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 7);
  const z = rng.int(11, 19);
  // h + e = 9 would make the answer the number of sticks in the task
  const e = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => h + x !== 9));
  const value = h + 1 + (z - 10) + e;
  const prompt = 'Tausche zu möglichst wenig Teilen. Wie viele Teile sind es dann?';
  return build(SKILL, stufe, {
    key: `tauschen:${h}:${z}:${e}`,
    ab,
    prompt,
    visual: { type: 'baseTen', hundreds: h, tens: z, ones: e },
    answer: { kind: 'number', value, unit: 'Teile', label: 'Teile' },
    hints: ['Immer ein Bündel Stangen ergibt 1 Platte.', 'Zähle danach alle Teile.'],
    steps: ['10 Stangen tauschst du gegen 1 Platte.', { text: `Dann sind es ${platten(h + 1)}, ${stangen(z - 10)} und ${wuerfel(e)}.`, visual: material(zahl(h, z, e)) }, `${h + 1} + ${z - 10} + ${e} = ${value} Teile`],
    bugs: numberBugs(
      [
        { id: 'nicht-wenigste', match: h + z + e, hint: 'Hier liegen mehr als 9 Stangen. Tausche ein Bündel gegen 1 Platte.' },
        { id: 'platten-statt-zahl', match: zahl(h, z, e), hint: 'Gefragt sind die Teile, nicht die Zahl.' },
      ],
      value,
    ),
    praise: 'Du hast 10 Stangen gegen 1 Platte getauscht.',
    srText: `Da liegen ${platten(h)}, ${stangen(z)} und ${wuerfel(e)}. ${prompt}`,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [bildZuZahl],
    2: [bildZuStellen, bildMitLuecke],
    3: [zahlZuBild],
  },
  2: {
    1: [regel(true)],
    2: [gemischtZuZahl, gemischtZuZahl, buendelnMulti],
    3: [doppeltGebuendelt, fehlendeHunderter],
  },
  3: {
    1: [alsZehner(true), regel(false)],
    2: [alsZehner(false), stangenBisTausend, wenigsteTeile],
    3: [wenigsteAusMaterial, wenigsteAusMaterial, tausendGeteilt, wenigsteBisTausend],
  },
};

export const buendelnSkill: SkillDef = {
  ...SKILL,
  title: 'Hunderter bündeln',
  description: 'Du bündelst zehn Zehner zu einem Hunderter.',
  stufen: {
    1: 'Platten, Stangen und Würfel lesen',
    2: '10 Zehner bündeln: 3 H 14 Z',
    3: 'Hunderter in Zehner tauschen, wenigste Teile finden',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
