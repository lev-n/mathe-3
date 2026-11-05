import { BOX } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, makeChoice, targetAb } from '../shared';
import { finish, mal, spoken, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.punkt-strich', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.terme'];

const ZUERST = (b: number, c: number) => `Mal kommt zuerst: Rechne erst ${mal(b, c)}.`;

/** a + b · c = □ */
function plusMal(a: number, b: number, c: number, malFirst: boolean): Task {
  const v = a + b * c;
  const expression = malFirst ? `${mal(b, c)} + ${a} = ${BOX}` : `${a} + ${mal(b, c)} = ${BOX}`;
  const prompt = 'Rechne die Malaufgabe zuerst.';
  return {
    key: `plus:${a}:${b}:${c}:${malFirst ? 'm' : 'p'}`,
    prompt,
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [ZUERST(b, c), `Rechne dann ${a} dazu.`],
    steps: [`Erst mal: ${mal(b, c)} = ${b * c}.`, `Dann plus: ${b * c} + ${a} = ${v}.`],
    bugs: bugList(v, [
      ['punkt-strich', malFirst ? b * (c + a) : (a + b) * c, ZUERST(b, c)],
      ['mal-als-plus', a + b + c, `${mal(b, c)} heißt ${b}-mal die ${c}.`],
    ]),
    praise: `Du hast zuerst ${mal(b, c)} gerechnet.`,
    srText: spoken(prompt, expression),
  };
}

/** n − b · c = □ */
function minusMal(n: number, b: number, c: number): Task {
  const v = n - b * c;
  const expression = `${n} − ${mal(b, c)} = ${BOX}`;
  const prompt = 'Rechne die Malaufgabe zuerst.';
  return {
    key: `minus:${n}:${b}:${c}`,
    prompt,
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [ZUERST(b, c), `Zieh das Ergebnis dann von ${n} ab.`],
    steps: [`Erst mal: ${mal(b, c)} = ${b * c}.`, `Dann minus: ${n} − ${b * c} = ${v}.`],
    bugs: bugList(v, [
      ['punkt-strich', (n - b) * c, ZUERST(b, c)],
      ['mal-als-plus', n - (b + c), `${mal(b, c)} heißt ${b}-mal die ${c}.`],
      ['rechenzeichen', n + b * c, 'Schau noch einmal auf das Rechenzeichen vor der Malaufgabe.'],
    ]),
    praise: `Du hast zuerst ${mal(b, c)} gerechnet und dann abgezogen.`,
    srText: spoken(prompt, expression),
  };
}

/** b · c − a = □ */
function malMinus(a: number, b: number, c: number): Task {
  const v = b * c - a;
  const expression = `${mal(b, c)} − ${a} = ${BOX}`;
  const prompt = 'Rechne die Malaufgabe zuerst.';
  return {
    key: `mal-minus:${a}:${b}:${c}`,
    prompt,
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [ZUERST(b, c), `Zieh dann ${a} ab.`],
    steps: [`Erst mal: ${mal(b, c)} = ${b * c}.`, `Dann minus: ${b * c} − ${a} = ${v}.`],
    bugs: bugList(v, [
      ['punkt-strich', c > a ? b * (c - a) : null, ZUERST(b, c)],
      ['rechenzeichen', b * c + a, 'Schau noch einmal auf das Rechenzeichen.'],
    ]),
    praise: `Du hast zuerst ${mal(b, c)} gerechnet.`,
    srText: spoken(prompt, expression),
  };
}

/** a · b + c · d = □ */
function zweiMal(a: number, b: number, c: number, d: number): Task {
  const v = a * b + c * d;
  const expression = `${mal(a, b)} + ${mal(c, d)} = ${BOX}`;
  const prompt = 'Rechne beide Malaufgaben zuerst.';
  return {
    key: `zwei:${a}:${b}:${c}:${d}`,
    prompt,
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Rechne erst ${mal(a, b)} und ${mal(c, d)}.`, 'Rechne die beiden Ergebnisse dann plus.'],
    steps: [`Erst mal: ${mal(a, b)} = ${a * b}; ${mal(c, d)} = ${c * d}.`, `Dann plus: ${a * b} + ${c * d} = ${v}.`],
    bugs: bugList(v, [['punkt-strich', (a * b + c) * d, `Mal kommt zuerst: Rechne erst ${mal(c, d)}.`]]),
    praise: 'Du hast erst beide Malaufgaben gerechnet.',
    srText: spoken(prompt, expression),
  };
}

/** 5 + 4 · 3 and 7 · 3: which sign fits? */
function vergleichen(rng: Rng): Task {
  const a = rng.int(2, 9);
  const b = rng.int(2, 6);
  const c = rng.int(2, 6);
  const left = a + b * c;
  // The right side is a Malaufgabe near the left value, sometimes with the same result.
  const candidates: [number, number][] = [];
  for (let x = 2; x <= 9; x++) for (let y = 2; y <= 9; y++) if (Math.abs(x * y - left) <= 6) candidates.push([x, y]);
  const [x, y] = candidates.length > 0 ? rng.pick(candidates) : [Math.max(2, b), c];
  const right = x * y;
  const correct = left < right ? '<' : left > right ? '>' : '=';
  const expression = `${a} + ${mal(b, c)} ${BOX} ${mal(x, y)}`;
  const prompt = 'Welches Zeichen passt?';
  const why = `Mal kommt zuerst: Rechne erst ${mal(b, c)}. Vergleiche dann.`;
  return {
    key: `vergleich:${a}:${b}:${c}:${x}:${y}`,
    prompt,
    expression,
    answer: makeChoice(rng, { label: correct }, ['<', '>', '='].filter((s) => s !== correct).map((label) => ({ label, whyWrong: why })), { layout: 'symbols', order: ['<', '>', '='] }),
    hints: [ZUERST(b, c), `Rechne beide Seiten aus und vergleiche.`],
    steps: [`Links: ${a} + ${mal(b, c)} = ${a} + ${b * c} = ${left}.`, `Rechts: ${mal(x, y)} = ${right}.`, `${left} ${correct} ${right}`],
    praise: 'Du hast beide Seiten gerechnet und dann verglichen.',
    srText: spoken(prompt, expression),
  };
}

/** Which Rechnung has this result? */
function ergebnisWaehlen(rng: Rng): Task {
  const a = rng.int(2, 9);
  const b = rng.int(2, 6);
  const c = rng.int(2, 6);
  const v = a + b * c;
  const prompt = `Welche Rechnung hat das Ergebnis ${v}?`;
  const options = [
    { label: `${mal(a, b)} + ${c}`, value: a * b + c, plus: false },
    { label: `${a} + ${b} + ${c}`, value: a + b + c, plus: true },
    { label: `${mal(a + 1, b)} + ${c}`, value: (a + 1) * b + c, plus: false },
    { label: `${mal(a, c)} + ${b}`, value: a * c + b, plus: false },
  ];
  const wrongs = options
    .filter((o) => o.value !== v)
    .map((o) => ({ label: o.label, whyWrong: o.plus ? `Hier steht nur plus. Es kommt ${o.value} heraus.` : `Mal kommt zuerst. Hier kommt ${o.value} heraus.` }));
  return {
    key: `wahl:${a}:${b}:${c}`,
    prompt,
    answer: makeChoice(rng, { label: `${a} + ${mal(b, c)}` }, wrongs),
    hints: ['Mal kommt zuerst: Rechne in jeder Rechnung zuerst die Malaufgabe.', 'Vergleiche jedes Ergebnis mit der Zahl aus der Frage.'],
    steps: [`${mal(b, c)} = ${b * c}`, `${a} + ${b * c} = ${v}`, `Also passt ${a} + ${mal(b, c)}.`],
    praise: 'Du hast jede Rechnung mit Mal zuerst geprüft.',
    srText: spoken(prompt),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const klein = (rng: Rng) => rng.int(2, 5);
const mittel = (rng: Rng) => rng.int(2, 9);

function minusZahl(rng: Rng): Task {
  const b = rng.int(2, 6);
  const c = rng.int(2, 6);
  return minusMal(b * c + rng.int(1, 20), b, c);
}

function malMinusZahl(rng: Rng): Task {
  const b = mittel(rng);
  const c = mittel(rng);
  return malMinus(rng.int(1, Math.min(9, b * c - 1)), b, c);
}

/** Two different Malaufgaben. */
function vierFaktoren(rng: Rng, first: (rng: Rng) => number, second: (rng: Rng) => number): [number, number, number, number] {
  const a = first(rng);
  const b = first(rng);
  const c = second(rng);
  let d = second(rng);
  if (a === c && b === d) d = d === 5 ? 2 : d + 1;
  return [a, b, c, d];
}

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => plusMal(rng.int(1, 9), klein(rng), klein(rng), false)],
    2: [(rng) => plusMal(rng.int(1, 9), klein(rng), klein(rng), true)],
    3: [(rng) => zweiMal(...vierFaktoren(rng, klein, klein))],
  },
  2: {
    1: [minusZahl],
    2: [malMinusZahl, (rng) => plusMal(rng.int(2, 20), mittel(rng), mittel(rng), false)],
    3: [(rng) => minusMal(rng.int(30, 100), rng.int(2, 5), rng.int(2, 5)), (rng) => zweiMal(...vierFaktoren(rng, mittel, klein))],
  },
  3: {
    1: [(rng) => plusMal(rng.int(2, 20), mittel(rng), mittel(rng), rng.chance(0.5)), minusZahl],
    2: [vergleichen],
    3: [vergleichen, ergebnisWaehlen],
  },
};

export const punktStrichSkill: SkillDef = {
  ...SKILL,
  title: 'Mal zuerst',
  description: 'Du rechnest die Malaufgabe vor der Plusaufgabe.',
  stufen: {
    1: 'Mal zuerst: 2 + 3 · 4',
    2: 'Minus und Mal: 20 − 3 · 4',
    3: 'Rechnungen vergleichen: 5 + 4 · 3 und 7 · 3',
  },
  kmk: KMK,
  optional: 'extra',
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
