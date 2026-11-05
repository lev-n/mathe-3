/**
 * zahlen.zahlenstrahl: reading and placing numbers on the Zahlenstrahl (docs/research.md §6). Reading an arrow needs a typed number, so
 * those items have a number answer; placing has the numberline answer; the arrow on the empty line is read by choosing. The Stufe decides
 * the line (ticks of 100; of 50 and 10; empty or ticks of 5), the AB level how far it helps: fewer labels are harder to read from.
 */
import type { Ab, ChoiceOption, Exercise, NumberLineAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, plural, safeHints, type MaybeBug } from '../shared';
import { ausFormen, strahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.zahlenstrahl', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'PK.darstellen'];

const HINT_SCHRITT = 'Schau zuerst: Wie viel ist ein Schritt von Strich zu Strich?';
const HINT_RICHTUNG = 'Der Zahlenstrahl beginnt links bei der 0.';

interface Linie {
  min: number;
  max: number;
  major: number;
  minor: number;
  labelMajor: boolean;
  labels?: number[];
}

const liniePlus = (l: Linie, marks: { value: number; label: string }[]) => strahl(l.min, l.max, l.major, l.minor, l.labelMajor, { ...(l.labels ? { labels: l.labels } : {}), marks });

function setzen(l: Linie, value: number, step: number, tolerance: number): NumberLineAnswer {
  return { kind: 'numberline', min: l.min, max: l.max, majorStep: l.major, minorStep: l.minor, step, value, tolerance, labelMajor: l.labelMajor, ...(l.labels ? { labels: l.labels } : {}) };
}

/** The labelled place to the left of value. */
function ausgang(l: Linie, value: number): number {
  const beschriftet = [...(l.labels ?? []), ...(l.labelMajor ? Array.from({ length: Math.round((l.max - l.min) / l.major) + 1 }, (_, i) => l.min + i * l.major) : []), l.min];
  return Math.max(...beschriftet.filter((x) => x <= value));
}

function schritte(l: Linie, value: number) {
  const von = ausgang(l, value);
  const k = (value - von) / l.minor;
  return [
    `Von Strich zu Strich sind es ${l.minor}.`,
    `Der Pfeil steht ${k} ${plural(k, 'Strich', 'Striche')} nach ${von}.`,
    `${von} + ${k} · ${l.minor} = ${value}`,
    { text: `Also ist der Pfeil bei ${value}.`, visual: liniePlus(l, [{ value, label: String(value) }]) },
  ];
}

/** Only the ends of a line are labelled: a key of its own, as the same number is another task there. */
const nurEnden = (l: Linie) => (l.labels?.length === 2 && !l.labelMajor && l.minor < l.max - l.min ? ':enden' : '');

function ablesen(l: Linie, value: number, bugs: MaybeBug[], hints: string[], stufe: Stufe, ab: Ab): Exercise {
  return build(SKILL, stufe, {
    key: `lesen:${l.min}:${l.max}:${l.minor}:${value}${nurEnden(l)}`,
    ab,
    prompt: 'Welche Zahl zeigt der Pfeil A?',
    visual: liniePlus(l, [{ value, label: 'A' }]),
    answer: { kind: 'number', value, label: 'Zahl am Pfeil' },
    hints: safeHints(hints, value, HINT_SCHRITT),
    steps: schritte(l, value),
    bugs: numberBugs(bugs, value),
    praise: 'Du hast zuerst die Schritte am Strahl bestimmt.',
    srText: `Zahlenstrahl von ${l.min} bis ${l.max}. Welche Zahl zeigt der Pfeil A?`,
    kmk: KMK,
  });
}

function zeigen(l: Linie, value: number, bugs: MaybeBug[], hints: string[], stufe: Stufe, ab: Ab): Exercise {
  return build(SKILL, stufe, {
    key: `setzen:${l.min}:${l.max}:${l.minor}:${value}${nurEnden(l)}`,
    ab,
    prompt: `Setz den Pfeil auf ${value}.`,
    answer: setzen(l, value, l.minor, 0),
    hints,
    steps: schritte(l, value),
    bugs: numberBugs(bugs, value),
    praise: 'Du hast die Schritte gezählt und die Stelle gefunden.',
    srText: `Zahlenstrahl von ${l.min} bis ${l.max}. Setz den Pfeil auf ${value}.`,
    kmk: KMK,
  });
}

// ─── Stufe 1: 0–1000, ticks every 100 ────────────────────────────────────────

const LINIE_100: Linie = { min: 0, max: 1000, major: 100, minor: 100, labelMajor: false, labels: [0, 500, 1000] };
const LINIE_100_ENDEN: Linie = { min: 0, max: 1000, major: 100, minor: 100, labelMajor: false, labels: [0, 1000] };

const HINTS_100 = ['Von Strich zu Strich sind es 100.', 'Geh von der 0 oder der 500 aus weiter.'];
const HINTS_100_ENDEN = ['Von Strich zu Strich sind es 100.', 'Geh von der 0 aus weiter.'];

const lesenBugs100 = (k: number): MaybeBug[] => [{ id: 'strahl-schritt', match: k * 10, hint: HINT_SCHRITT }, { id: 'strahl-schritt', match: k, hint: HINT_SCHRITT }];
const setzenBugs100 = (value: number): MaybeBug[] => [{ id: 'strahl-richtung', match: 1000 - value, hint: HINT_RICHTUNG }];

const hunderterLesen: Form = (rng, stufe, ab) => {
  const k = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
  return ablesen(LINIE_100, k * 100, lesenBugs100(k), HINTS_100, stufe, ab);
};

const hunderterZeigen: Form = (rng, stufe, ab) => {
  const value = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]) * 100;
  return zeigen(LINIE_100, value, setzenBugs100(value), HINTS_100, stufe, ab);
};

/** Only 0 and 1000 are labelled, and the number lies far from both ends. */
const hunderterEnden: Form = (rng, stufe, ab) => {
  const k = rng.int(2, 8);
  const value = k * 100;
  return rng.chance(0.5) ? ablesen(LINIE_100_ENDEN, value, lesenBugs100(k), HINTS_100_ENDEN, stufe, ab) : zeigen(LINIE_100_ENDEN, value, setzenBugs100(value), HINTS_100_ENDEN, stufe, ab);
};

// ─── Stufe 2: ticks every 50; a section with ticks every 10 ──────────────────

const LINIE_50: Linie = { min: 0, max: 1000, major: 100, minor: 50, labelMajor: true };

function fuenfziger(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9) * 100;
  const value = h + 50;
  const hints = ['Von Strich zu Strich sind es 50.', 'Der kurze Strich liegt in der Mitte zwischen 2 Hundertern.'];
  if (rng.chance(0.5)) return ablesen(LINIE_50, value, [{ id: 'strahl-schritt', match: h + 10, hint: HINT_SCHRITT }, { id: 'strahl-schritt', match: h + 1, hint: HINT_SCHRITT }], hints, stufe, ab);
  // 5 short steps as if each were 10: 650 is put at 850
  const zuWeit = h + 5 * 50;
  return zeigen(LINIE_50, value, [zuWeit <= 1000 && { id: 'strahl-schritt', match: zuWeit, hint: HINT_SCHRITT }], hints, stufe, ab);
}

/** A section 300–400 with ticks of 10: with the 350 labelled, or only with its ends. */
const abschnitt10 = (enden: boolean): Form => (rng, stufe, ab) => {
  const h = rng.int(1, 9) * 100;
  const l: Linie = enden ? { min: h, max: h + 100, major: 50, minor: 10, labelMajor: false, labels: [h, h + 100] } : { min: h, max: h + 100, major: 50, minor: 10, labelMajor: true };
  const k = rng.pick(enden ? [2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 6, 7, 8, 9]);
  const value = h + k * 10;
  const hints = ['Von Strich zu Strich sind es 10.', `Der Abschnitt geht von ${h} bis ${h + 100}.`];
  if (rng.chance(0.5)) return ablesen(l, value, [{ id: 'strahl-schritt', match: h + k, hint: HINT_SCHRITT }], hints, stufe, ab);
  return zeigen(l, value, [{ id: 'strahl-richtung', match: 2 * h + 100 - value, hint: 'Links steht die kleinere Zahl. Rechts steht die größere.' }], hints, stufe, ab);
};

// ─── Stufe 3: empty line, estimate; a section with ticks of 5 ────────────────

/** Estimating on the empty line is rough: the arrow may be up to 75 away, under a tenth of the line. A heuristic, to check in the pilot. */
const SCHAETZ_TOLERANZ = 75;
/** The hardest estimate: a child who halves the line twice lands inside this. Also a heuristic. */
const SCHAETZ_TOLERANZ_ENG = 50;

const LEER: Linie = { min: 0, max: 1000, major: 1000, minor: 1000, labelMajor: true };
const leeresBild = (value: number, label: string) => strahl(0, 1000, 100, 100, true, { marks: [{ value, label }] });
const mitteSchritte = (value: number) => ['Die Mitte ist 500.', value < 500 ? `${value} liegt vor der Mitte.` : `${value} liegt hinter der Mitte.`, { text: `So liegt ${value} am Strahl.`, visual: leeresBild(value, String(value)) }];

const VIELFACHE_50 = [100, 150, 200, 250, 300, 350, 400, 450, 550, 600, 650, 700, 750, 800, 850, 900];

const schaetzen = (werte: (rng: Rng) => number, toleranz: number): Form => (rng, stufe, ab) => {
  const value = werte(rng);
  const gespiegelt = 1000 - value;
  return build(SKILL, stufe, {
    key: `schaetzen:${value}${toleranz === SCHAETZ_TOLERANZ ? '' : ':eng'}`,
    ab,
    prompt: `Der Strahl hat keine Striche. Schätze: Wo liegt ${value}?`,
    answer: setzen(LEER, value, 10, toleranz),
    hints: ['Die Mitte ist 500. Liegt die Zahl davor oder dahinter?', 'Teile das Stück noch einmal in der Mitte.'],
    steps: mitteSchritte(value),
    bugs: numberBugs([Math.abs(gespiegelt - value) > toleranz && { id: 'strahl-richtung', match: gespiegelt, hint: HINT_RICHTUNG }], value),
    praise: 'Du hast die Mitte als Hilfe genutzt.',
    srText: `Zahlenstrahl von 0 bis 1000 ohne Striche. Schätze: Wo liegt ${value}?`,
    kmk: KMK,
    knobel: true,
  });
};

const schaetzRund = (rng: Rng) => rng.pick(VIELFACHE_50);
const schaetzGenau = (rng: Rng) => rng.pick(VIELFACHE_50) + rng.pick([0, 0, 10, 20, -10, -20]);

/**
 * The estimate the other way round: the arrow stands, and the nearest options lie 100 away. Halving the line once or twice gives 500, 250 and 750, so
 * these are no answers here: the child has to judge the arrow to within 50 (SCHAETZ_TOLERANZ_ENG).
 */
function schaetzenLesen(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const value = rng.pick(VIELFACHE_50.filter((x) => x !== 250 && x !== 750));
  const seite = (x: number) => x < 500;
  const nah = rng.shuffle([-3, -2, -1, 1, 2, 3].map((k) => value + k * 100).filter((x) => x >= 50 && x <= 950)).sort((x, y) => Math.abs(x - value) - Math.abs(y - value));
  const wrongs: ChoiceOption[] = nah
    .slice(0, 3)
    .map((x) => ({ label: String(x), whyWrong: seite(x) === seite(value) ? 'Teile das Stück noch einmal in der Mitte.' : 'Die Mitte ist 500. Liegt der Pfeil davor oder dahinter?' }));
  const frage = 'Welche Zahl zeigt der Pfeil A ungefähr?';
  return build(SKILL, stufe, {
    key: `schaetzlesen:${value}`,
    ab,
    prompt: `Der Strahl hat keine Striche. ${frage}`,
    visual: strahl(0, 1000, 1000, 1000, true, { marks: [{ value, label: 'A' }] }),
    answer: makeChoice(rng, { label: String(value) }, wrongs),
    hints: ['Die Mitte ist 500. Liegt der Pfeil davor oder dahinter?', 'Teile das Stück noch einmal in der Mitte.'],
    steps: mitteSchritte(value),
    praise: 'Du hast die Mitte als Hilfe genutzt.',
    srText: `Zahlenstrahl von 0 bis 1000 ohne Striche. ${frage}`,
    kmk: KMK,
    knobel: true,
  });
}

/**
 * A section with ticks of 5. `art` 'nah': the arrow stands to read, just after a label. 'beschriftet': read or place with the 50 labelled.
 * 'enden': read or place, and only the ends are labelled.
 */
const abschnitt5 = (art: 'nah' | 'beschriftet' | 'enden'): Form => (rng, stufe, ab) => {
  const h = rng.int(1, 9) * 100;
  const l: Linie = art === 'enden' ? { min: h, max: h + 100, major: 50, minor: 5, labelMajor: false, labels: [h, h + 100] } : { min: h, max: h + 100, major: 50, minor: 5, labelMajor: true };
  const value = h + 5 * rng.pick(art === 'nah' ? [1, 2, 3, 11, 12, 13] : art === 'enden' ? [6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17] : [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19]);
  const von = ausgang(l, value);
  const k = (value - von) / 5;
  const hints = ['Von Strich zu Strich sind es 5.', `Geh von ${von} aus in kleinen Schritten weiter.`];
  const mitZehn = von + k * 10;
  if (art === 'nah' || rng.chance(0.5)) {
    return ablesen(l, value, [{ id: 'strahl-schritt', match: von + k, hint: HINT_SCHRITT }, mitZehn <= l.max && { id: 'strahl-schritt', match: mitZehn, hint: HINT_SCHRITT }], hints, stufe, ab);
  }
  return zeigen(l, value, [mitZehn <= l.max && { id: 'strahl-schritt', match: mitZehn, hint: HINT_SCHRITT }], hints, stufe, ab);
};

/** The Stufe decides the line, the AB level how far it helps. */
const FORMEN: Formen = {
  1: {
    1: [hunderterLesen],
    2: [hunderterZeigen],
    3: [hunderterEnden],
  },
  2: {
    1: [fuenfziger],
    2: [abschnitt10(false)],
    3: [abschnitt10(true)],
  },
  3: {
    1: [abschnitt5('nah'), schaetzen(schaetzRund, SCHAETZ_TOLERANZ)],
    2: [abschnitt5('beschriftet'), schaetzen(schaetzGenau, SCHAETZ_TOLERANZ)],
    3: [abschnitt5('enden'), schaetzen(schaetzGenau, SCHAETZ_TOLERANZ_ENG), schaetzenLesen],
  },
};

export const zahlenstrahlSkill: SkillDef = {
  ...SKILL,
  title: 'Zahlenstrahl bis 1000',
  description: 'Du liest und zeigst Zahlen am Zahlenstrahl.',
  stufen: {
    1: 'Striche in Schritten von 100',
    2: 'Striche in Schritten von 50 und 10',
    3: 'Schätzen am leeren Strahl, Striche in Schritten von 5',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
