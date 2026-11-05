/**
 * zahlen.stellenwerte: the Stellenwerttafel, zeros, unordered places, the value of a digit (docs/research.md §6).
 */
import { BOX } from '../../core/format';
import type { Ab, Exercise, MultiField, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs } from '../shared';
import { STELLE_WORT, ausFormen, dreiZiffern, ohneNullen, stellen, tafel, tafelMit, zahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.stellenwerte', topicId: 'zahlen' } as const;
const KMK = ['ZO.stellenwert', 'PK.darstellen'];

const HINT_REIHENFOLGE = 'Schau auf die Buchstaben. Die Hunderter stehen vorne.';
const HINT_DREHER = 'Der Zehner steht vor dem Einer. Schau auf die Buchstaben.';

// ─── Stufe 1: table to number, no zeros ──────────────────────────────────────

function ohneNullBugs(n: number) {
  const { h, z, e } = stellen(n);
  return numberBugs(
    [
      { id: 'stellen-reihenfolge', match: zahl(e, z, h), hint: HINT_REIHENFOLGE },
      { id: 'zahlendreher', match: zahl(h, e, z), hint: HINT_DREHER },
    ],
    n,
  );
}

function tafelZuZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ohneNullen(rng);
  const { h, z, e } = stellen(n);
  return build(SKILL, stufe, {
    key: `tafel:${n}`,
    ab,
    prompt: 'Welche Zahl steht in der Tafel?',
    visual: tafel(n),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Lies die Tafel von links nach rechts.', 'Links stehen die Hunderter. Rechts stehen die Einer.'],
    steps: [`${h} H sind ${h * 100}. ${z} Z sind ${z * 10}. ${e} E sind ${e}.`, `${h * 100} + ${z * 10} + ${e} = ${n}`],
    bugs: ohneNullBugs(n),
    praise: 'Du hast die Stellen der Reihe nach gelesen.',
    srText: `${h} Hunderter, ${z} Zehner und ${e} Einer. Welche Zahl ist das?`,
    kmk: KMK,
  });
}

function kurzZuZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = ohneNullen(rng);
  const { h, z, e } = stellen(n);
  return build(SKILL, stufe, {
    key: `kurz:${n}`,
    ab,
    prompt: 'Schreib die Zahl.',
    expression: `${h} H ${z} Z ${e} E = ${BOX}`,
    visual: tafelMit([null, null, null]),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['H heißt Hunderter, Z heißt Zehner und E heißt Einer.', 'Stell dir die Ziffern in der Tafel vor.'],
    steps: [{ text: `Die Tafel zeigt ${h} H, ${z} Z und ${e} E.`, visual: tafel(n) }, `Also heißt die Zahl ${n}.`],
    bugs: ohneNullBugs(n),
    praise: 'Du hast jede Ziffer an ihre Stelle geschrieben.',
    srText: `${h} Hunderter, ${z} Zehner und ${e} Einer. Schreib die Zahl.`,
    kmk: KMK,
  });
}

/** The number to its places, also with an empty place: 305 has 0 Zehner. */
function zuStellen(n: number, stufe: Stufe, ab: Ab): Exercise {
  const { h, z, e } = stellen(n);
  const mitNull = z === 0 || e === 0;
  const fields: MultiField[] = [
    { id: 'h', value: h, after: 'Hunderter', label: 'Hunderter' },
    { id: 'z', value: z, after: 'Zehner', label: 'Zehner' },
    { id: 'e', value: e, after: 'Einer', label: 'Einer' },
  ];
  return build(SKILL, stufe, {
    key: `zerlege:${n}`,
    ab,
    prompt: 'Wie viele Hunderter, Zehner und Einer hat die Zahl?',
    expression: String(n),
    visual: tafelMit([null, null, null]),
    answer: { kind: 'multi', fields },
    hints: ['Die erste Ziffer sind die Hunderter.', mitNull ? 'Eine 0 heißt: An dieser Stelle ist nichts.' : 'Die letzte Ziffer sind die Einer.'],
    steps: [{ text: `${n} in der Tafel:`, visual: tafel(n) }, `Also: ${h} Hunderter, ${z} Zehner und ${e} Einer.`],
    bugs: multiBugs(
      [
        { id: 'stellen-reihenfolge', match: { h: e, e: h }, hint: 'Die erste Ziffer sind die Hunderter.' },
        mitNull ? { id: 'null-falsche-stelle', match: { z: e, e: z }, hint: 'Schau genau: An welcher Stelle steht die 0?' } : { id: 'zahlendreher', match: { z: e, e: z }, hint: 'Die Ziffer in der Mitte sind die Zehner.' },
      ],
      fields,
    ),
    praise: mitNull ? 'Du hast auch die 0 der richtigen Stelle zugeordnet.' : 'Du hast jede Ziffer der richtigen Stelle zugeordnet.',
    srText: `Wie viele Hunderter, Zehner und Einer hat ${n}?`,
    kmk: KMK,
  });
}

const zahlZuTafel: Form = (rng, stufe, ab) => zuStellen(ohneNullen(rng), stufe, ab);

// ─── Stufe 2: zeros, unordered places ────────────────────────────────────────

/** The bugs of a number with an empty place. */
function nullBugs(h: number, z: number, e: number) {
  if (z === 0) {
    return [
      { id: 'null-vergessen', match: 10 * h + e, hint: 'Keine Zehner? Dann steht dort eine 0.' },
      { id: 'null-falsche-stelle', match: 100 * h + 10 * e, hint: `Stell dir die Tafel vor: ${h} Hunderter, 0 Zehner, ${e} Einer.` },
    ];
  }
  return [
    { id: 'null-vergessen', match: 10 * h + z, hint: 'Keine Einer? Dann steht dort eine 0.' },
    { id: 'null-falsche-stelle', match: 100 * h + z, hint: `Stell dir die Tafel vor: ${h} Hunderter, ${z} Zehner, 0 Einer.` },
  ];
}

function mitNull(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const h = rng.int(1, 9);
  const keineZehner = rng.chance(0.65);
  const z = keineZehner ? 0 : rng.int(1, 9);
  const e = keineZehner ? rng.int(1, 9) : 0;
  const n = zahl(h, z, e);
  const leereTafel = rng.chance(0.35);
  const teile = [`${h} H`, keineZehner ? `${e} E` : `${z} Z`];
  const leer = keineZehner ? 'Zehner' : 'Einer';
  return build(SKILL, stufe, {
    key: `null:${n}:${leereTafel ? 'tafel' : 'kurz'}`,
    ab,
    prompt: leereTafel ? 'Welche Zahl steht in der Tafel?' : 'Schreib die Zahl.',
    ...(leereTafel ? { visual: tafelMit([h, keineZehner ? null : z, keineZehner ? e : null]) } : { expression: `${teile.join(' ')} = ${BOX}` }),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: [`Hier fehlen die ${leer}.`, 'Eine leere Stelle heißt: Dort steht eine 0.'],
    steps: [{ text: `${h} Hunderter, ${z} Zehner und ${e} Einer:`, visual: tafel(n) }, `Bei den ${leer}n steht eine 0.`, `Also heißt die Zahl ${n}.`],
    bugs: numberBugs(nullBugs(h, z, e), n),
    praise: `Du hast die 0 bei den ${leer}n mitgeschrieben.`,
    // names only the places on screen: the 0 is what the task tests
    srText: `${h} Hunderter und ${keineZehner ? `${e} Einer` : `${z} Zehner`}. ${leereTafel ? 'Welche Zahl steht in der Tafel?' : 'Schreib die Zahl.'}`,
    kmk: KMK,
  });
}

const zahlMitNullZuTafel: Form = (rng, stufe, ab) => zuStellen(rng.chance(0.65) ? zahl(rng.int(1, 9), 0, rng.int(1, 9)) : zahl(rng.int(1, 9), rng.int(1, 9), 0), stufe, ab);

/** 4 E 3 H 2 Z, or with an empty place on top of it: 5 E 3 H. */
const durcheinander = (mitLuecke: boolean): Form => (rng, stufe, ab) => {
  const h = rng.int(1, 9);
  const keineZehner = mitLuecke && rng.chance(0.5);
  const keineEiner = mitLuecke && !keineZehner;
  const z = keineZehner ? 0 : rng.int(1, 9);
  const e = keineEiner ? 0 : rng.int(1, 9);
  const n = zahl(h, z, e);
  const teile: [number, PlaceColumn][] = [[h, 'H'], ...(z ? [[z, 'Z'] as [number, PlaceColumn]] : []), ...(e ? [[e, 'E'] as [number, PlaceColumn]] : [])];
  // never in the order H, Z, E: start with the Einer or the Zehner
  let shown = rng.shuffle(teile);
  if (shown[0][1] === 'H') shown = [...shown.slice(1), shown[0]];
  const wieGeschrieben = Number(shown.map(([d]) => d).join(''));
  return build(SKILL, stufe, {
    key: `durcheinander:${shown.map(([d, c]) => `${d}${c}`).join('')}`,
    ab,
    prompt: 'Die Stellen sind durcheinander. Schreib die Zahl.',
    expression: `${shown.map(([d, c]) => `${d} ${c}`).join(' ')} = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: [HINT_REIHENFOLGE, 'Schreib zuerst die Hunderter, dann die Zehner, dann die Einer.'],
    steps: [`Geordnet: ${h} H, ${z} Z, ${e} E`, { text: `In der Tafel steht ${n}.`, visual: tafel(n) }],
    bugs: numberBugs(
      [
        { id: 'stellen-reihenfolge', match: wieGeschrieben, hint: HINT_REIHENFOLGE },
        ...(mitLuecke ? nullBugs(h, z, e) : [{ id: 'zahlendreher', match: zahl(h, e, z), hint: HINT_DREHER }]),
      ],
      n,
    ),
    praise: 'Du hast auf die Buchstaben geschaut und richtig geordnet.',
    srText: `${shown.map(([d, c]) => `${d} ${STELLE_WORT[c]}`).join(', ')}. Schreib die Zahl.`,
    kmk: KMK,
  });
};

// ─── Stufe 3: split, value of a digit ────────────────────────────────────────

/** All orders of these values. */
const ordnungen = (xs: number[]): number[][] => (xs.length < 2 ? [xs] : xs.flatMap((x, i) => ordnungen(xs.filter((_, j) => j !== i)).map((rest) => [x, ...rest])));

const zerlegen = (mitNullen: boolean): Form => (rng, stufe, ab) => {
  const n = !mitNullen ? ohneNullen(rng) : rng.chance(0.5) ? zahl(rng.int(1, 9), 0, rng.int(1, 9)) : zahl(rng.int(1, 9), rng.int(1, 9), 0);
  const { h, z, e } = stellen(n);
  // each field names its place on screen: □ + □ + □ alone would make every order of the values a true equation.
  // Also a place with a 0 has its field: leaving it out would show which place is empty, and the prompt names all three.
  const fields: MultiField[] = [
    { id: 'a', value: h * 100, before: 'Hunderter:', label: 'Hunderter' },
    { id: 'b', value: z * 10, before: 'Zehner:', label: 'Zehner' },
    { id: 'c', value: e, before: 'Einer:', label: 'Einer' },
  ];
  const summe = `${h * 100} + ${z * 10} + ${e}`;
  return build(SKILL, stufe, {
    key: `zerlegen:${n}`,
    ab,
    prompt: 'Zerlege die Zahl in Hunderter, Zehner und Einer.',
    expression: `${n} = ${BOX} + ${BOX} + ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: ['Welchen Wert hat jede Ziffer an ihrer Stelle?', mitNullen ? 'Steht an einer Stelle eine 0? Dann ist auch der Wert dieser Stelle 0.' : 'Hunderter haben 2 Nullen. Zehner haben 1 Null.'],
    steps: [{ text: `${n} in der Tafel:`, visual: tafel(n) }, `${n} = ${summe}`],
    bugs: multiBugs(
      [
        { id: 'ziffer-statt-wert', match: { a: h, b: z, c: e }, hint: 'Die Ziffer allein reicht nicht. Welchen Wert hat jede Stelle?' },
        ...ordnungen(fields.map((f) => f.value)).map((werte) => ({
          id: 'stellen-reihenfolge',
          match: Object.fromEntries(fields.map((f, i) => [f.id, werte[i]])),
          hint: 'Die Werte stimmen. Jeder Wert gehört in das Feld seiner Stelle.',
        })),
      ],
      fields,
    ),
    praise: 'Du hast den Wert jeder Stelle aufgeschrieben.',
    srText: `Zerlege ${n} in Hunderter, Zehner und Einer.`,
    kmk: KMK,
  });
};

const STELLEN: { c: PlaceColumn; faktor: number; bei: string }[] = [
  { c: 'H', faktor: 100, bei: 'bei den Hundertern' },
  { c: 'Z', faktor: 10, bei: 'bei den Zehnern' },
  { c: 'E', faktor: 1, bei: 'bei den Einern' },
];

function wertEinerZiffer(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = dreiZiffern(rng);
  const n = zahl(a, b, c);
  // not the Einer: the value of an Einer is the digit in the question
  const i = rng.int(0, 1);
  const d = [a, b, c][i];
  const stelle = STELLEN[i];
  const value = d * stelle.faktor;
  return build(SKILL, stufe, {
    key: `wert:${n}:${i}`,
    ab,
    prompt: `Welchen Wert hat die ${d} in ${n}?`,
    answer: { kind: 'number', value, label: 'Wert' },
    hints: ['Stell dir die Zahl in der Tafel vor.', `An welcher Stelle steht die ${d}?`],
    steps: [{ text: `Die ${d} steht ${stelle.bei}.`, visual: tafel(n) }, `Also hat die ${d} den Wert ${value}.`],
    bugs: numberBugs(
      [
        { id: 'ziffer-statt-wert', match: d, hint: `Schau auf die Stelle: Die ${d} steht nicht bei den Einern.` },
        ...STELLEN.filter((s) => s.faktor > 1).map((s) => ({ id: 'falscher-wert', match: d * s.faktor, hint: `Schau auf die Stelle der ${d} in der Zahl.` })),
      ],
      value,
    ),
    praise: 'Du hast an der Stelle den Wert der Ziffer erkannt.',
    srText: `Welchen Wert hat die ${d} in ${n}?`,
    kmk: KMK,
  });
}

function zahlMitWert(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [d, a, b] = dreiZiffern(rng);
  const i = rng.int(0, 2);
  const stelle = STELLEN[i];
  const value = d * stelle.faktor;
  const anStelle = (k: number) => (k === 0 ? zahl(d, a, b) : k === 1 ? zahl(a, d, b) : zahl(a, b, d));
  const n = anStelle(i);
  const answer = makeChoice(
    rng,
    { label: String(n) },
    [0, 1, 2]
      .filter((k) => k !== i)
      .map((k) => ({ label: String(anStelle(k)), whyWrong: `In ${anStelle(k)} hat die ${d} den Wert ${d * STELLEN[k].faktor}.` })),
  );
  return build(SKILL, stufe, {
    key: `welche:${d}:${a}:${b}:${i}`,
    ab,
    prompt: `In welcher Zahl hat die ${d} den Wert ${value}?`,
    answer,
    hints: [`Wert ${value}: An welcher Stelle steht die ${d} dann?`, `Prüfe jede Zahl: Wo steht die ${d}?`],
    steps: [`Die ${d} muss ${stelle.bei} stehen.`, { text: `In ${n} steht die ${d} ${stelle.bei}.`, visual: tafel(n) }],
    praise: 'Du hast in jeder Zahl die Stelle der Ziffer geprüft.',
    srText: `In welcher Zahl hat die ${d} den Wert ${value}?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/**
 * A sum whose parts do not just name the places (400 + 60 + 15): a part spans two places, so ordering the parts is not enough, as it is for 5 E 3 H on
 * Stufe 2. With a gap the 0 appears only after adding: 200 + 90 + 15 is 305.
 */
const summeZuZahl = (mitNullen: boolean): Form => (rng, stufe, ab) => {
  const n = !mitNullen ? zahl(rng.int(2, 9), rng.int(2, 9), rng.int(1, 9)) : rng.chance(0.5) ? zahl(rng.int(2, 9), 0, rng.int(1, 9)) : zahl(rng.int(2, 9), rng.int(2, 9), 0);
  const { h, z, e } = stellen(n);
  const ueberEiner = mitNullen ? z === 0 : rng.chance(0.5);
  const geordnet = ueberEiner ? [z === 0 ? (h - 1) * 100 : h * 100, z === 0 ? 90 : (z - 1) * 10, 10 + e] : [(h - 1) * 100, 100 + (e === 0 ? (z - 1) * 10 : z * 10), e === 0 ? 10 : e];
  let shown = rng.shuffle(geordnet);
  if (shown[0] === geordnet[0]) shown = [...shown.slice(1), shown[0]];
  const summe = shown.join(' + ');
  const fuehrend = Number(shown.map((s) => String(s)[0]).join(''));
  const [x, y, w] = geordnet;
  return build(SKILL, stufe, {
    key: `summe:${summe}`,
    ab,
    prompt: 'Rechne zusammen. Welche Zahl ist das?',
    expression: `${summe} = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Ordne zuerst die Zahlen. Die größte Zahl steht vorne.', mitNullen ? 'Fehlt am Ende eine Stelle? Dann steht dort eine 0.' : 'Rechne Schritt für Schritt. Eine Zahl hat 2 Stellen.'],
    steps: [{ text: `Geordnet: ${geordnet.join(' + ')}`, visual: tafel(n) }, `${x} + ${y} = ${x + y}`, `${x + y} + ${w} = ${n}`],
    bugs: numberBugs(
      [
        { id: 'stellen-reihenfolge', match: fuehrend, hint: 'Ordne zuerst. Die Hunderter stehen vorne.' },
        { id: 'falscher-wert', match: ueberEiner ? n - 10 : n - 100, hint: 'Eine Zahl hat 2 Stellen. Rechne beide Stellen mit.' },
        ...(mitNullen ? nullBugs(h, z, e) : []),
      ],
      n,
    ),
    praise: 'Du hast alle Werte Schritt für Schritt gerechnet.',
    srText: `${summe}. Rechne zusammen. Welche Zahl ist das?`,
    kmk: KMK,
  });
};

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [tafelZuZahl],
    2: [kurzZuZahl],
    3: [zahlZuTafel],
  },
  2: {
    1: [mitNull],
    2: [durcheinander(false)],
    3: [durcheinander(true), zahlMitNullZuTafel],
  },
  3: {
    1: [wertEinerZiffer, zerlegen(false)],
    2: [zerlegen(true), summeZuZahl(false)],
    3: [zahlMitWert, summeZuZahl(true)],
  },
};

export const stellenwerteSkill: SkillDef = {
  ...SKILL,
  title: 'Hunderter, Zehner, Einer',
  description: 'Du liest die Stellenwerttafel und schreibst die Zahl.',
  stufen: {
    1: 'Die Tafel lesen, ohne Nullen',
    2: 'Mit Nullen und durcheinander: 3 H 5 E',
    3: 'Zahlen zerlegen und den Wert einer Ziffer finden',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
