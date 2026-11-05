import { BOX } from '../../core/format';
import type { Ab, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, makeChoice, multiBugs, targetAb } from '../shared';
import { MINUS_OP, PLUS_OP, calc, finish, flip, spoken, spokenFields, term, type Op, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.analog', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.kopfrechnen'];
const KMK_MUSTER = ['ZO.kopfrechnen', 'MS.muster'];

const DIGIT_HINT = (unit: string) => `Das ist die kleine Aufgabe. Hier rechnest du mit ${unit}n.`;
const ZU_WENIG = 'Hier zählst du Hunderter, nicht Zehner.';
const zuViel = (unit: string) => `Hier zählst du ${unit}, nicht ${unit === 'Hunderter' ? 'Tausender' : 'Hunderter'}.`;
/** Only for a gap on the right: in a gap on the left the start is the missing number. */
const FEHLT = 'Du suchst den fehlenden Teil. Rechne vom Anfang bis zum Ergebnis.';
const UMKEHRAUFGABE = 'Rechne rückwärts: Die Umkehraufgabe hat das andere Rechenzeichen.';
/** 'Es fehlen 3.' and 'Es fehlt 1.' */
const esFehlt = (n: number) => `Es ${n === 1 ? 'fehlt' : 'fehlen'} ${n}.`;
/** 'Das sind 3 Zehner.' and 'Das ist 1 Zehner.' */
const dasSind = (n: number, unit: string) => `Das ${n === 1 ? 'ist' : 'sind'} ${n} ${unit}.`;

// ─── Stufe 1: 3 + 4, so 300 + 400 ─────────────────────────────────────────────

interface Einfach {
  a: number;
  b: number;
  scale: 10 | 100;
  unit: 'Hunderter' | 'Zehner';
}

function einfach(rng: Rng): Einfach {
  const a = rng.int(1, 8);
  const b = rng.int(1, 10 - a);
  const scale = rng.pick([100, 100, 10] as const);
  return { a, b, scale, unit: scale === 100 ? 'Hunderter' : 'Zehner' };
}

function einfachBugs({ a, b, scale, unit }: Einfach) {
  const r = a + b;
  return bugList(r * scale, [
    ['klein-gerechnet', r, DIGIT_HINT(unit)],
    ['null-zu-wenig', scale === 100 ? r * 10 : null, ZU_WENIG],
    ['null-zu-viel', r * scale * 10, zuViel(unit)],
  ]);
}

function einfachSteps({ a, b, scale, unit }: Einfach) {
  const r = a + b;
  return [`${a} + ${b} = ${r}`, `${a} ${unit} und ${b} ${unit} sind ${r} ${unit}.`, `Also: ${a * scale} + ${b * scale} = ${r * scale}.`];
}

function baseTenOf({ a, b, scale }: Einfach) {
  return scale === 100 ? ({ type: 'baseTen', hundreds: a, tens: 0, ones: 0, second: { hundreds: b, mode: 'dazu' } } as const) : ({ type: 'baseTen', tens: a, ones: 0, second: { tens: b, mode: 'dazu' } } as const);
}

function gezeigt(rng: Rng): Task {
  const e = einfach(rng);
  const { a, b, scale, unit } = e;
  const expression = `${a} + ${b} = ${a + b}, also ${a * scale} + ${b * scale} = ${BOX}`;
  return {
    key: `gezeigt:${a}:${b}:${scale}`,
    prompt: 'Nutze die kleine Aufgabe.',
    expression,
    visual: baseTenOf(e),
    answer: { kind: 'number', value: (a + b) * scale, label: 'Ergebnis' },
    hints: [`Lies die Zahlen als ${unit}: ${a} ${unit} und ${b} ${unit}.`, `Du kennst die kleine Aufgabe. Jetzt zählst du ${unit}.`],
    steps: einfachSteps(e),
    bugs: einfachBugs(e),
    praise: `Du hast mit ${unit}n wie mit Einern gerechnet.`,
    srText: spoken('Nutze die kleine Aufgabe.', expression),
  };
}

function ohneHilfe(rng: Rng): Task {
  const e = einfach(rng);
  const { a, b, scale, unit } = e;
  const expression = `${a * scale} + ${b * scale} = ${BOX}`;
  return {
    key: `ohne:${a}:${b}:${scale}`,
    prompt: 'Denk an die kleine Aufgabe und rechne.',
    expression,
    answer: { kind: 'number', value: (a + b) * scale, label: 'Ergebnis' },
    hints: [`Die kleine Aufgabe ist ${a} + ${b}.`, `Rechne mit ${unit}n: ${a} ${unit} und ${b} ${unit}.`],
    steps: einfachSteps(e),
    bugs: einfachBugs(e),
    praise: `Du hast die kleine Aufgabe ${a} + ${b} genutzt.`,
    srText: spoken('Denk an die kleine Aufgabe und rechne.', expression),
  };
}

function beideRechnen(rng: Rng): Task {
  let e = einfach(rng);
  // 500 + 500 = 1000: 4 digits do not fit a field of a multi answer on a phone.
  while (e.scale === 100 && e.a + e.b === 10) e = einfach(rng);
  const { a, b, scale, unit } = e;
  const r = a + b;
  const fields = [
    { id: 's', value: r, before: `${a} + ${b} =`, label: 'Kleine Aufgabe' },
    { id: 'g', value: r * scale, before: `${a * scale} + ${b * scale} =`, label: 'Große Aufgabe' },
  ];
  const prompt = 'Rechne erst die kleine Aufgabe, dann die große Aufgabe.';
  return {
    key: `beide:${a}:${b}:${scale}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Beide Aufgaben haben die gleichen Ziffern.', `In der großen Aufgabe zählst du ${unit}.`],
    steps: [`${a} ${unit} und ${b} ${unit} sind ${r} ${unit}.`, `${a} + ${b} = ${r}; ${a * scale} + ${b * scale} = ${r * scale}.`],
    bugs: multiBugs(
      [
        { id: 'klein-gerechnet', match: { g: r }, hint: DIGIT_HINT(unit) },
        scale === 100 && { id: 'null-zu-wenig', match: { g: r * 10 }, hint: ZU_WENIG },
        { id: 'null-zu-viel', match: { g: r * scale * 10 }, hint: zuViel(unit) },
      ],
      fields,
    ),
    praise: 'Du hast die kleine und die große Aufgabe verbunden.',
    srText: spoken(prompt, spokenFields(fields)),
  };
}

function einfachLuecke(rng: Rng): Task {
  let e = einfach(rng);
  // 90 + □ = 100: the small task 9 + □ = 10 would name the answer.
  while (e.scale === 10 && e.a + e.b === 10) e = einfach(rng);
  const { a, b, scale, unit } = e;
  const r = a + b;
  const left = rng.chance(0.3);
  const expression = left ? `${BOX} + ${b * scale} = ${r * scale}` : `${a * scale} + ${BOX} = ${r * scale}`;
  const value = (left ? a : b) * scale;
  const known = left ? b : a;
  return {
    key: `luecke:${a}:${b}:${scale}:${left ? 'l' : 'r'}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [`Denk an die kleine Aufgabe: ${known} + ${BOX} = ${r}.`, `Es fehlen ${unit}. Wie viele sind es?`],
    steps: [`Kleine Aufgabe: ${known} + ${BOX} = ${r}. ${esFehlt(r - known)}`, dasSind(r - known, unit), `Also: ${a * scale} + ${b * scale} = ${r * scale}.`],
    bugs: bugList(value, [
      ['klein-gerechnet', r - known, DIGIT_HINT(unit)],
      ['rechenzeichen', left ? r * scale + known * scale : null, UMKEHRAUFGABE],
      ['summe-gerechnet', left ? null : r * scale + known * scale, FEHLT],
    ]),
    praise: `Du hast die fehlenden ${unit} gefunden.`,
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Stufe 2 and 3: 12 + 3, so 120 + 30; minus too ────────────────────────────

interface Zweistellig {
  a: number;
  b: number;
  op: Op;
  r: number;
  /** The small task crosses a ten, the big task a hundred. */
  cross: boolean;
}

function zweistellig(rng: Rng, cross: boolean, ops: readonly Op[] = [PLUS_OP, MINUS_OP]): Zweistellig {
  const op = rng.pick(ops);
  const b = rng.int(cross ? 3 : 1, cross ? 9 : 8);
  if (op === '+') {
    const ones = cross ? rng.int(11 - b, 9) : rng.int(1, 9 - b);
    const a = rng.int(1, 8) * 10 + ones;
    return { a, b, op, r: a + b, cross };
  }
  const ones = cross ? rng.int(0, b - 1) : rng.int(b, 9);
  const a = rng.int(cross ? 2 : 1, 9) * 10 + ones;
  return { a, b, op, r: a - b, cross };
}

function zweistelligBugs(z: Zweistellig) {
  const { a, b, op, r, cross } = z;
  const A = a * 10;
  const B = b * 10;
  const R = r * 10;
  const hundreds = Math.floor(A / 100);
  const za = Math.floor(A / 10) % 10;
  return bugList(R, [
    ['klein-gerechnet', r, DIGIT_HINT('Zehner')],
    ['null-zu-viel', R * 10, 'Nur eine Null kommt dazu. Schau auf die kleine Aufgabe.'],
    ['rechenzeichen', op === '+' ? (A >= B ? A - B : null) : A + B, 'Schau noch einmal auf das Rechenzeichen.'],
    ['hunderter-uebergang', op === '+' && cross ? hundreds * 100 + ((za + b) % 10) * 10 : null, `${za} Zehner und ${b} Zehner sind ${za + b} Zehner. Das ist 1 Hunderter mehr.`],
    ['hunderter-uebergang', op === '+' && cross ? Number(`${hundreds}${za + b}0`) : null, `${za} Zehner und ${b} Zehner sind ${za + b} Zehner. Das ist 1 Hunderter mehr.`],
    ['minus-spalten', op !== '+' && cross ? hundreds * 100 + Math.abs(za - b) * 10 : null, `${za} − ${b} geht nicht. Rechne erst bis ${hundreds * 100}, dann weiter.`],
  ]);
}

function zweistelligGezeigt(z: Zweistellig): Task {
  const { a, b, op, r } = z;
  const expression = `${term(a, op, b)} = ${r}, also ${term(a * 10, op, b * 10)} = ${BOX}`;
  return {
    key: `z-gezeigt:${a}:${op}:${b}`,
    prompt: 'Nutze die kleine Aufgabe.',
    expression,
    ...(z.cross ? {} : { visual: { type: 'baseTen', hundreds: Math.floor(a / 10), tens: a % 10, ones: 0, second: { tens: b, mode: op === '+' ? 'dazu' : 'weg' } } as const }),
    answer: { kind: 'number', value: r * 10, label: 'Ergebnis' },
    hints: ['In der großen Aufgabe zählst du Zehner.', `Das Ergebnis ${r} zählt jetzt Zehner.`],
    steps: [`Kleine Aufgabe: ${term(a, op, b)} = ${r}.`, `Das sind ${r} Zehner.`, `Also: ${term(a * 10, op, b * 10)} = ${r * 10}.`],
    bugs: zweistelligBugs(z),
    praise: `Du hast aus ${term(a, op, b)} die große Aufgabe gemacht.`,
    srText: spoken('Nutze die kleine Aufgabe.', expression),
  };
}

function zweistelligOhne(z: Zweistellig): Task {
  const { a, b, op, r } = z;
  const expression = `${term(a * 10, op, b * 10)} = ${BOX}`;
  return {
    key: `z-ohne:${a}:${op}:${b}`,
    prompt: 'Denk an die kleine Aufgabe und rechne.',
    expression,
    answer: { kind: 'number', value: r * 10, label: 'Ergebnis' },
    hints: [`Die kleine Aufgabe ist ${term(a, op, b)}.`, 'Rechne die kleine Aufgabe. Das Ergebnis zählt Zehner.'],
    steps: [`Kleine Aufgabe: ${term(a, op, b)} = ${r}.`, `Das sind ${r} Zehner.`, `Also: ${term(a * 10, op, b * 10)} = ${r * 10}.`],
    bugs: zweistelligBugs(z),
    praise: `Du hast die kleine Aufgabe ${term(a, op, b)} genutzt.`,
    srText: spoken('Denk an die kleine Aufgabe und rechne.', expression),
  };
}

function zweistelligLuecke(z: Zweistellig, rng: Rng): Task {
  const { a, b, op, r } = z;
  // 300 − □ = 270 or 880 − □ = 800: the small task would name the answer, so that gap moves to the front.
  const left = a === b * 10 || r === b * 10 || rng.chance(0.4);
  const expression = left ? `${BOX} ${op} ${b * 10} = ${r * 10}` : `${a * 10} ${op} ${BOX} = ${r * 10}`;
  const value = (left ? a : b) * 10;
  const smallGap = left ? `${BOX} ${op} ${b} = ${r}` : `${a} ${op} ${BOX} = ${r}`;
  return {
    key: `z-luecke:${a}:${op}:${b}:${left ? 'l' : 'r'}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [`Denk an die kleine Aufgabe: ${smallGap}.`, left ? 'Rechne rückwärts mit der Umkehraufgabe.' : 'Rechne vom Anfang bis zum Ergebnis.'],
    // The start of a minus task is no missing part: the Umkehraufgabe of the hint finds it.
    steps: [`Kleine Aufgabe: ${smallGap}. ${left && op === MINUS_OP ? `Umkehraufgabe: ${term(r, PLUS_OP, b)} = ${value / 10}.` : esFehlt(value / 10)}`, dasSind(value / 10, 'Zehner'), `Also: ${term(a * 10, op, b * 10)} = ${r * 10}.`],
    bugs: bugList(value, [
      ['klein-gerechnet', value / 10, DIGIT_HINT('Zehner')],
      ['rechenzeichen', left ? calc(r * 10, op, b * 10) : null, UMKEHRAUFGABE],
      ['summe-gerechnet', !left && op === '+' ? r * 10 + a * 10 : null, FEHLT],
    ]),
    praise: 'Du hast die Lücke mit der kleinen Aufgabe gefunden.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Stufe 3: choose the matching task, continue a Päckchen ───────────────────

function waehleKlein(rng: Rng): Task {
  const { a, b, op } = zweistellig(rng, rng.chance(0.5));
  const A = a * 10;
  const B = b * 10;
  const prompt = `Welche kleine Aufgabe passt zu ${term(A, op, B)}?`;
  const wrongs: ChoiceOption[] = [
    { label: term(a, flip(op), b), whyWrong: 'Schau noch einmal auf das Rechenzeichen.' },
    { label: term(a, op, B), whyWrong: 'Bei beiden Zahlen fällt eine Null weg.' },
    { label: term(A, op, b), whyWrong: 'Bei beiden Zahlen fällt eine Null weg.' },
    { label: term(Math.floor(a / 10), op, b), whyWrong: `${A} sind ${a} Zehner, nicht ${Math.floor(a / 10)}.` },
  ];
  return {
    key: `klein:${a}:${op}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: term(a, op, b) }, wrongs),
    hints: ['Das Rechenzeichen bleibt gleich.', 'Bei beiden Zahlen fällt eine Null weg.'],
    steps: [`Bei ${A} und ${B} fällt je eine Null weg.`, `Die kleine Aufgabe ist ${term(a, op, b)}.`],
    praise: 'Du hast die Zehner in beiden Zahlen gesehen.',
    srText: spoken(prompt),
  };
}

function waehleGross(rng: Rng): Task {
  const { a, b, op } = zweistellig(rng, rng.chance(0.5));
  const A = a * 10;
  const B = b * 10;
  const prompt = `Welche große Aufgabe passt zu ${term(a, op, b)}?`;
  const wrongs: ChoiceOption[] = [
    { label: term(A, flip(op), B), whyWrong: 'Schau noch einmal auf das Rechenzeichen.' },
    { label: term(A, op, b), whyWrong: 'Beide Zahlen bekommen eine Null.' },
    { label: term(a, op, B), whyWrong: 'Beide Zahlen bekommen eine Null.' },
    { label: term(A * 10, op, B), whyWrong: 'Beide Zahlen bekommen genau eine Null.' },
  ];
  return {
    key: `gross:${a}:${op}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: term(A, op, B) }, wrongs),
    hints: ['Das Rechenzeichen bleibt gleich.', 'Beide Zahlen zählen jetzt Zehner.'],
    steps: [`${a} und ${b} zählen jetzt Zehner.`, `Die große Aufgabe ist ${term(A, op, B)}.`],
    praise: 'Du hast beide Zahlen zu Zehnern gemacht.',
    srText: spoken(prompt),
  };
}

function paeckchen(rng: Rng): Task {
  const op = rng.pick([PLUS_OP, MINUS_OP]);
  const step = rng.pick([10, 10, 20, 100]);
  const B = rng.int(2, 9) * 10;
  // 4 rows stay inside 1000 and above 0.
  const start = op === '+' ? rng.int(2, 5) * 100 + rng.int(1, 9) * 10 : rng.int(5, 9) * 100 + rng.int(1, 9) * 10;
  const row = (i: number) => (op === '+' ? start + i * step : start - i * step);
  const r0 = calc(row(0), op, B);
  const r1 = calc(row(1), op, B);
  const fields = [
    { id: 'p1', value: calc(row(2), op, B), before: `${term(row(2), op, B)} =`, label: 'Dritte Aufgabe' },
    { id: 'p2', value: calc(row(3), op, B), before: `${term(row(3), op, B)} =`, label: 'Vierte Aufgabe' },
  ];
  const prompt = 'Setze das Päckchen fort.';
  const expression = `${term(row(0), op, B)} = ${r0}, ${term(row(1), op, B)} = ${r1}`;
  return {
    key: `paeckchen:${start}:${op}:${B}:${step}`,
    kmk: KMK_MUSTER,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Vergleiche die beiden Aufgaben. Was ändert sich?', `Die ${B} bleibt gleich. Nur die erste Zahl ändert sich.`],
    steps: [`Die erste Zahl wird immer um ${step} ${op === '+' ? 'größer' : 'kleiner'}.`, `Die ${B} bleibt gleich. Das Ergebnis ändert sich auch um ${step}.`, `Also: ${term(row(2), op, B)} = ${fields[0].value}; ${term(row(3), op, B)} = ${fields[1].value}.`],
    bugs: multiBugs(
      [
        { id: 'paeckchen-schritt', match: { p1: calc(r1, op, B), p2: calc(calc(r1, op, B), op, B) }, hint: `Nur die erste Zahl ändert sich. Die ${B} bleibt gleich.` },
        { id: 'paeckchen-schritt', match: { p1: r1 }, hint: `Die erste Zahl ändert sich um ${step}. Das Ergebnis auch.` },
      ],
      fields,
    ),
    praise: 'Du hast das Muster im Päckchen genutzt.',
    srText: spoken(prompt, expression, spokenFields(fields)),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [gezeigt],
    2: [ohneHilfe, beideRechnen],
    3: [einfachLuecke],
  },
  2: {
    1: [(rng) => zweistelligGezeigt(zweistellig(rng, false))],
    2: [(rng) => zweistelligOhne(zweistellig(rng, false)), (rng) => zweistelligOhne(zweistellig(rng, true, [PLUS_OP]))],
    3: [(rng) => zweistelligOhne(zweistellig(rng, true)), (rng) => zweistelligLuecke(zweistellig(rng, false), rng)],
  },
  3: {
    1: [(rng) => zweistelligGezeigt(zweistellig(rng, true))],
    2: [waehleKlein, waehleGross],
    3: [paeckchen, (rng) => zweistelligLuecke(zweistellig(rng, true), rng)],
  },
};

export const analogSkill: SkillDef = {
  ...SKILL,
  title: 'Kleine und große Aufgabe',
  description: 'Du nutzt 3 + 4, um 300 + 400 zu rechnen.',
  stufen: {
    1: 'Kleine Aufgabe nutzen: 3 + 4, so 300 + 400',
    2: '12 + 3, so 120 + 30, auch mit Minus',
    3: 'Passende kleine Aufgabe wählen und Päckchen fortsetzen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
