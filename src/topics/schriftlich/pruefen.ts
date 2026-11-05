import { roughlyEqual } from '../../core/check';
import { APPROX, MINUS, fmt, speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, SubtractionMethod, Visual, WrittenOp } from '../../core/types';
import { build, makeChoice, multiBugs, targetAb } from '../shared';
import { candidatesFor, otherReadings, type BugCandidate } from './bugs';
import { attempt, equationOf, methodOf, randLen, solved, termOf, toHundred, writtenItem } from './common';
import { fitsProbe, probeItem } from './formen';

const SKILL = { id: 'schriftlich.pruefen', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schaetzen', 'ZO.kontrolle'];

type PlusMinus = Extract<WrittenOp, 'add' | 'sub'>;

const rough = (op: PlusMinus, a: number, b: number) => (op === 'add' ? toHundred(a) + toHundred(b) : toHundred(a) - toHundred(b));

/** Numbers whose Überschlag really helps: both round clearly, and the exact result lies near the Überschlag (within 25 %). */
function roundable(rng: Rng, op: PlusMinus): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 3);
      const b = randLen(rng, 3);
      if (a % 100 === 50 || b % 100 === 50) return null;
      if (a % 100 === 0 || b % 100 === 0) return null;
      if (op === 'add' ? a + b >= 1000 : a <= b + 100) return null;
      const u = rough(op, a, b);
      if (u <= 0 || u > 1000) return null;
      return roughlyEqual(op === 'add' ? a + b : a - b, u) ? [a, b] : null;
    },
    op === 'add' ? [386, 412] : [712, 389],
  );
}

/** How far the number lies from the middle of its hundred: small means the Zehner decide, near 50. */
const fromMiddle = (n: number) => Math.abs((n % 100) - 50);

/** Numbers that are easy to round: 'clear' stays away from the middle of a hundred, 'close' has a number within 9 of it. */
function roundableBy(rng: Rng, op: PlusMinus, kind: 'clear' | 'close'): [number, number] {
  return attempt<[number, number]>(
    () => {
      const pair = roundable(rng, op);
      return (kind === 'clear' ? pair.every((n) => fromMiddle(n) >= 20) : pair.some((n) => fromMiddle(n) <= 9)) ? pair : null;
    },
    kind === 'clear' ? (op === 'add' ? [312, 481] : [712, 389]) : (op === 'add' ? [347, 412] : [712, 352]),
  );
}

/** A section of the number line with the number and its two hundreds. */
function hundredLine(n: number): Visual {
  const low = Math.floor(n / 100) * 100;
  return { type: 'numberLine', min: low, max: low + 100, majorStep: 100, minorStep: 10, labelMajor: true, marks: [{ value: n, label: fmt(n) }] };
}

const closerLine = (n: number) => `${fmt(n)} liegt näher an ${fmt(toHundred(n))}.`;

/** Stufe 1: which Überschlag fits? AB 1 with numbers that round clearly, AB 2 with a number near the middle of a hundred. */
function chooseRough(rng: Rng, stufe: Stufe, ab: Ab, kind: 'clear' | 'close'): Exercise {
  const op: PlusMinus = rng.chance(0.6) ? 'add' : 'sub';
  const [a, b] = roundableBy(rng, op, kind);
  const ra = toHundred(a);
  const rb = toHundred(b);
  const sign = op === 'add' ? '+' : MINUS;
  const text = (x: number, y: number) => `${fmt(x)} ${sign} ${fmt(y)}`;
  const down = (n: number) => Math.floor(n / 100) * 100;
  const up = (n: number) => down(n) + 100;
  const other = (n: number) => (toHundred(n) === down(n) ? up(n) : down(n));
  const wrongs: ChoiceOption[] = [
    { label: text(other(a), rb), whyWrong: `${closerLine(a)} Schau auf die Zehner.` },
    { label: text(ra, other(b)), whyWrong: `${closerLine(b)} Schau auf die Zehner.` },
    { label: text(down(a), down(b)), whyWrong: 'Runde jede Zahl zum nächsten Hunderter. Schneide nichts einfach ab.' },
  ].filter((o) => o.label !== text(ra, rb));
  return build(SKILL, stufe, {
    key: `wahl:${op}:${a}|${b}`,
    ab,
    prompt: 'Runde auf Hunderter. Welcher Überschlag passt?',
    expression: termOf(op, [a, b]),
    answer: makeChoice(rng, { label: text(ra, rb) }, wrongs),
    hints: ['Schau bei jeder Zahl auf die Zehner.', 'Ab 50 geht es zum nächsten Hunderter, sonst bleibt der Hunderter.'],
    steps: [
      { text: closerLine(a), visual: hundredLine(a) },
      { text: closerLine(b), visual: hundredLine(b) },
      `Überschlag: ${text(ra, rb)} = ${fmt(rough(op, a, b))}.`,
    ],
    praise: 'Du hast beide Zahlen zum nächsten Hunderter gerundet.',
    srText: `${speak(termOf(op, [a, b]))}. Runde auf Hunderter. Welcher Überschlag passt?`,
    kmk: KMK,
  });
}

/** Stufe 1, AB 3: which result is possible? The child makes the Überschlag first. An exact result equal to it would give the answer away in the hints. */
function chooseResult(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const op: PlusMinus = rng.chance(0.6) ? 'add' : 'sub';
  const [a, b] = attempt<[number, number]>(
    () => {
      const pair = roundable(rng, op);
      return (op === 'add' ? pair[0] + pair[1] : pair[0] - pair[1]) === rough(op, pair[0], pair[1]) ? null : pair;
    },
    op === 'add' ? [386, 412] : [712, 389],
  );
  const u = rough(op, a, b);
  const exact = op === 'add' ? a + b : a - b;
  const offs = (n: number) => (n + 300 <= 1000 ? n + 300 : n - 300);
  const far = [offs(exact), exact >= 400 ? exact - 400 : exact + 400, exact >= 500 ? exact - 500 : exact + 500].filter((x) => x > 0 && !roughlyEqual(x, u));
  const prompt = 'Mach zuerst einen Überschlag. Welches Ergebnis kann stimmen?';
  return build(SKILL, stufe, {
    key: `ergebnis:${op}:${a}|${b}`,
    ab,
    prompt,
    expression: termOf(op, [a, b]),
    answer: makeChoice(rng, { label: fmt(exact) }, far.map((x): ChoiceOption => ({ label: fmt(x), whyWrong: `Das ist weit weg vom Überschlag. Such eine Zahl in der Nähe.` }))),
    hints: ['Runde beide Zahlen zum nächsten Hunderter.', 'Welche Zahl liegt nah am Überschlag?'],
    steps: [`Überschlag: ${termOf(op, [toHundred(a), toHundred(b)])} = ${fmt(u)}.`, { text: `Genau: ${equationOf(op, [a, b])}.`, visual: solved(op, [a, b], method, stufe) }],
    praise: 'Du hast das Ergebnis mit dem Überschlag verglichen.',
    srText: `${speak(termOf(op, [a, b]))}. ${prompt}`,
    kmk: KMK,
  });
}

/** Stufe 1, AB 3: backwards. Which task has this Überschlag? */
function chooseTask(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const op: PlusMinus = rng.chance(0.6) ? 'add' : 'sub';
  const { a, b, rivals } = attempt<{ a: number; b: number; rivals: [number, number][] }>(
    () => {
      const [x, y] = roundable(rng, op);
      const u = rough(op, x, y);
      const flip = (n: number) => (n % 100 < 50 ? n + 50 : n - 50);
      const moved: [number, number][] = [[x + 100, y], [x - 100, y], [x, y + 100], [x, y - 100], [flip(x), y], [x, flip(y)]];
      const seen = new Set([u]);
      const near = rng.shuffle(moved).filter(([p, q]) => {
        const r = rough(op, p, q);
        if (p < 100 || q < 100 || p > 999 || q > 999 || (op === 'add' ? p + q >= 1000 : p <= q) || r <= 0 || r > 1000 || seen.has(r)) return false;
        seen.add(r);
        return true;
      });
      return near.length >= 2 ? { a: x, b: y, rivals: near.slice(0, 3) } : null;
    },
    op === 'add' ? { a: 386, b: 412, rivals: [[486, 412], [386, 512]] } : { a: 712, b: 389, rivals: [[812, 389], [712, 289]] },
  );
  const u = rough(op, a, b);
  const prompt = `Zu welcher Aufgabe passt der Überschlag ${fmt(u)}?`;
  const sign = op === 'add' ? '+' : MINUS;
  return build(SKILL, stufe, {
    key: `aufgabe:${op}:${a}|${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: termOf(op, [a, b]) }, rivals.map(([p, q]): ChoiceOption => ({ label: termOf(op, [p, q]), whyWrong: `Zu dieser Aufgabe passt der Überschlag ${fmt(rough(op, p, q))}.` }))),
    hints: ['Runde bei jeder Aufgabe beide Zahlen.', 'Schau bei jeder Zahl auf die Zehner.'],
    steps: [
      { text: closerLine(a), visual: hundredLine(a) },
      { text: closerLine(b), visual: hundredLine(b) },
      `Überschlag: ${fmt(toHundred(a))} ${sign} ${fmt(toHundred(b))} = ${fmt(u)}.`,
    ],
    praise: 'Du hast von der Rundung zur Aufgabe gedacht.',
    srText: prompt,
    kmk: KMK,
  });
}

/** 508 + 406: a Übertrag reaches a column of zeros, and the Überschlag still fits. */
function zeroColumnPair(rng: Rng): [number, number] {
  const ones = rng.int(2, 9);
  return [rng.int(1, 5) * 100 + ones, rng.int(1, 4) * 100 + rng.int(10 - ones, 9)];
}

/** Stufe 2: first write the Überschlag, then calculate. */
function roughThenWritten(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const op: PlusMinus = rng.chance(0.5) ? 'add' : 'sub';
  const [a, b] = op === 'add' && rng.chance(0.2) ? zeroColumnPair(rng) : roundable(rng, op);
  const u = rough(op, a, b);
  return writtenItem(SKILL, stufe, {
    ab,
    op,
    operands: [a, b],
    method,
    form: 'ueberschlag',
    kmk: KMK,
    prompt: 'Mach zuerst einen Überschlag. Runde auf Hunderter. Dann rechne schriftlich.',
    ueberschlag: u,
    hints: ['Runde jede Zahl zum nächsten Hunderter.'],
    before: [`Überschlag: ${termOf(op, [toHundred(a), toHundred(b)])} = ${fmt(u)}.`],
    praise: 'Du hast zuerst überschlagen und dann genau gerechnet.',
    srLead: 'Mach zuerst einen Überschlag, runde auf Hunderter. Dann rechne schriftlich',
  });
}

/** Stufe 2: round both numbers and add up, in fields. */
function roundInFields(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const op: PlusMinus = rng.chance(0.5) ? 'add' : 'sub';
  const [a, b] = attempt<[number, number]>(
    () => {
      const pair = roundable(rng, op);
      return Math.floor(pair[0] / 100) * 100 !== toHundred(pair[0]) || Math.floor(pair[1] / 100) * 100 !== toHundred(pair[1]) ? pair : null;
    },
    op === 'add' ? [386, 472] : [712, 389],
  );
  const ra = toHundred(a);
  const rb = toHundred(b);
  const u = rough(op, a, b);
  const fields = [
    { id: 'a', value: ra, before: `${fmt(a)} ${APPROX}`, label: `${a} gerundet` },
    { id: 'b', value: rb, before: `${fmt(b)} ${APPROX}`, label: `${b} gerundet` },
    { id: 'u', value: u, before: 'Überschlag:', label: 'Überschlag' },
  ];
  const fa = Math.floor(a / 100) * 100;
  const fb = Math.floor(b / 100) * 100;
  const fu = op === 'add' ? fa + fb : fa - fb;
  return build(SKILL, stufe, {
    key: `felder:${op}:${a}|${b}`,
    ab,
    prompt: 'Runde auf Hunderter. Rechne dann den Überschlag.',
    expression: termOf(op, [a, b]),
    answer: { kind: 'multi', fields },
    hints: ['Schau bei jeder Zahl auf die Zehner.', 'Mit den gerundeten Zahlen rechnest du im Kopf.'],
    steps: [
      { text: closerLine(a), visual: hundredLine(a) },
      { text: closerLine(b), visual: hundredLine(b) },
      `Überschlag: ${fmt(ra)} ${op === 'add' ? '+' : MINUS} ${fmt(rb)} = ${fmt(u)}.`,
    ],
    bugs: multiBugs([fu > 0 ? { id: 'runden-abschneiden', match: { a: fa, b: fb, u: fu }, hint: 'Schau auf die Zehner. Ab 50 geht es zum nächsten Hunderter.' } : null], fields),
    praise: 'Du hast beide Zahlen richtig gerundet.',
    srText: `${speak(termOf(op, [a, b]))}. Runde auf Hunderter. Rechne dann den Überschlag.`,
    kmk: KMK,
  });
}

/** Stufe 2: which task checks the calculation? */
function chooseProbe(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = roundable(rng, 'sub');
  const c = a - b;
  return build(SKILL, stufe, {
    key: `probe:${a}|${b}`,
    ab,
    prompt: 'Welche Umkehraufgabe prüft diese Rechnung?',
    expression: equationOf('sub', [a, b]),
    answer: makeChoice(rng, { label: `${fmt(c)} + ${fmt(b)}` }, [
      { label: `${fmt(a)} + ${fmt(b)}`, whyWrong: `Die Probe beginnt mit dem Ergebnis: ${fmt(c)}.` },
      { label: `${fmt(a)} + ${fmt(c)}`, whyWrong: `Die Probe beginnt mit dem Ergebnis: ${fmt(c)}.` },
      { label: `${fmt(Math.max(b, c))} ${MINUS} ${fmt(Math.min(b, c))}`, whyWrong: 'Minus prüfst du mit Plus.' },
    ]),
    hints: ['Minus prüfst du mit Plus.', 'Das Ergebnis plus die untere Zahl gibt die obere Zahl.'],
    steps: [`Umkehraufgabe: ${fmt(c)} + ${fmt(b)}.`, { text: `${fmt(c)} + ${fmt(b)} = ${fmt(a)}. Das passt zur Rechnung.`, visual: solved('add', [c, b], 'abziehen', stufe) }],
    praise: 'Du hast die passende Umkehraufgabe gefunden.',
    srText: `${speak(equationOf('sub', [a, b]))}. Welche Umkehraufgabe prüft diese Rechnung?`,
    kmk: KMK,
  });
}

/** Stufe 2, AB 3: calculate, then check the own result with the Umkehraufgabe, in the method set. No result on screen: a planted one belongs to Stufe 3. */
function probeWritten(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const op: PlusMinus = rng.chance(0.5) ? 'add' : 'sub';
  const operands = attempt<[number, number]>(
    () => {
      const ops = roundable(rng, op);
      return fitsProbe(op, ops) ? ops : null;
    },
    op === 'add' ? [386, 412] : [712, 389],
  );
  return probeItem(SKILL, stufe, ab, { op, operands, method, form: `probe-${op}`, kmk: KMK, prompt: 'Rechne schriftlich. Prüfe dein Ergebnis dann mit der Umkehraufgabe.' });
}

interface Far {
  op: PlusMinus;
  operands: [number, number];
  bug: BugCandidate & { value: number };
  u: number;
}

/**
 * Least distance of a result that is 'weit weg'. Rounding two numbers to hundreds moves a result by up to 99, so a correct calculation can
 * reach anything nearer. At this distance the two arrows on the number line also keep their labels apart.
 */
const FAR = 150;

/** A mistake the Überschlag can catch: the wrong result lies far from it, the exact one near. */
function farMistake(rng: Rng, method: SubtractionMethod): Far {
  const shifted = candidatesFor('add', [231, 64], method).find((c) => c.id === 'nicht-stellengerecht');
  const fallback: Far = { op: 'add', operands: [231, 64], u: 300, bug: { ...shifted!, value: 871 } };
  return attempt<Far>(
    () => {
      const op: PlusMinus = rng.chance(0.5) ? 'add' : 'sub';
      const operands: [number, number] = op === 'add' && rng.chance(0.6) ? [randLen(rng, 3), randLen(rng, 2)] : roundable(rng, op);
      const [a, b] = operands;
      if (a % 100 === 50) return null;
      if (b % 100 === 50) return null;
      // 34 rounds to 0: 'Überschlag: 500 + 0' would say that the small number does not count
      if (toHundred(b) === 0) return null;
      const u = rough(op, a, b);
      const exact = op === 'add' ? a + b : a - b;
      // an exact result equal to the Überschlag: the prompt that names the Überschlag would state the answer
      if (u <= 0 || u > 1000 || exact >= 1000 || exact === u || !roughlyEqual(exact, u)) return null;
      // 406 − 203: the shown calculation would hold the answer as its lower number
      if (exact === b) return null;
      const options = candidatesFor(op, operands, method).filter((c): c is BugCandidate & { value: number } => c.value !== null && c.value > 0 && c.value <= 1000 && c.value !== exact && !roughlyEqual(c.value, u) && Math.abs(c.value - u) >= FAR);
      return options.length ? { op, operands, bug: rng.pick(options), u } : null;
    },
    fallback,
  );
}

/** Stufe 3, the shared lines of a result far from the Überschlag. */
function farLines({ op, operands, bug, u }: Far) {
  const given = equationOf(op, operands, bug.value);
  const roughLine = `Überschlag: ${termOf(op, operands.map(toHundred))} = ${fmt(u)}.`;
  return { given, roughLine, farLine: `Das Ergebnis ${fmt(bug.value)} liegt weit weg.` };
}

/** Stufe 3, AB 1: a result far from the Überschlag, so calculate again. */
function calculateAgain(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const far = farMistake(rng, method);
  const { op, operands, bug, u } = far;
  const { given, roughLine, farLine } = farLines(far);
  return writtenItem(SKILL, stufe, {
    ab,
    op,
    operands: [...operands],
    method,
    form: `neu-${bug.id}`,
    kmk: KMK,
    prompt: `Der Überschlag ist ${fmt(u)}. Das Ergebnis liegt weit weg. Rechne neu.`,
    expression: given,
    bugs: [{ id: bug.id, match: bug.value, hint: bug.hint }],
    before: [roughLine, farLine],
    praise: 'Du hast den Überschlag genutzt und neu gerechnet.',
    srLead: `${speak(given)}. Der Überschlag ist ${fmt(u)}. Das Ergebnis liegt weit weg. Rechne neu`,
  });
}

/** Stufe 3, AB 2: a result far from the Überschlag. What went wrong? */
function whatHappened(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const far = farMistake(rng, method);
  const { op, operands, bug, u } = far;
  const { given, roughLine, farLine } = farLines(far);
  // the arrows carry the numbers: both stand in the task with their meaning, and the words 'Überschlag' and 'Ergebnis' do not fit side by side
  const line: Visual = { type: 'numberLine', min: 0, max: 1000, majorStep: 100, minorStep: 100, labelMajor: true, marks: [{ value: u, label: fmt(u) }, { value: bug.value, label: fmt(bug.value) }] };
  const wrongs = otherReadings(op, operands, method, bug, bug.value).map((c): ChoiceOption => ({ label: c.label, whyWrong: 'Rechne selbst nach und vergleiche mit dem Ergebnis.' }));
  return build(SKILL, stufe, {
    key: `fehler:${op}:${operands.join('|')}:${bug.id}:${method[0]}`,
    ab,
    prompt: `Der Überschlag ist ${fmt(u)}. Das Ergebnis liegt weit weg. Was stimmt nicht?`,
    expression: given,
    visual: line,
    answer: makeChoice(rng, { label: bug.label }, rng.shuffle(wrongs), { max: 4 }),
    hints: ['Rechne selbst nach, von den Einern aus.', 'Vergleiche jede Spalte mit dem Ergebnis.'],
    steps: [roughLine, farLine, `Der Fehler: ${bug.label}`, { text: `Richtig ist ${equationOf(op, operands)}.`, visual: solved(op, operands, method, stufe) }],
    praise: 'Du hast mit dem Überschlag den Fehler gefunden.',
    srText: `${speak(given)}. Der Überschlag ist ${fmt(u)}. Das Ergebnis liegt weit weg. Was stimmt nicht?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB 3: nobody gives the Überschlag. Of three calculations, one lies far from its own. */
function whichCannotBe(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const far = farMistake(rng, method);
  const { op, operands, bug } = far;
  const { given, roughLine, farLine } = farLines(far);
  const prompt = 'Mach bei jeder Rechnung einen Überschlag. Welche Rechnung kann nicht stimmen?';
  const seen = new Set([termOf(op, operands)]);
  const fine = (): ChoiceOption => {
    const [x, y, kind] = attempt<[number, number, PlusMinus]>(
      () => {
        const other: PlusMinus = rng.chance(0.5) ? 'add' : 'sub';
        const [p, q] = roundable(rng, other);
        const term = termOf(other, [p, q]);
        if (seen.has(term)) return null;
        seen.add(term);
        return [p, q, other];
      },
      op === 'add' ? [712, 389, 'sub'] : [386, 412, 'add'],
    );
    return { label: equationOf(kind, [x, y]), whyWrong: 'Hier liegt das Ergebnis nah am Überschlag.' };
  };
  return build(SKILL, stufe, {
    key: `welche:${op}:${operands.join('|')}:${bug.id}:${method[0]}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: given }, [fine(), fine()]),
    hints: ['Runde die Zahlen jeder Rechnung auf Hunderter.', 'Liegt das Ergebnis nah am Überschlag?'],
    steps: [roughLine, farLine, `Der Fehler: ${bug.label}`, { text: `Richtig ist ${equationOf(op, operands)}.`, visual: solved(op, operands, method, stufe) }],
    praise: 'Du hast jede Rechnung mit dem Überschlag geprüft.',
    srText: prompt,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

export const pruefenSkill: SkillDef = {
  ...SKILL,
  title: 'Überschlagen und prüfen',
  description: 'Du schätzt vorher und prüfst nachher dein Ergebnis.',
  stufen: {
    1: 'Den passenden Überschlag wählen, auf Hunderter runden',
    2: 'Überschlag schreiben, dann rechnen; Umkehraufgabe',
    3: 'Ergebnis weit weg vom Überschlag: den Fehler finden',
  },
  kmk: KMK,
  usesMethod: true,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = methodOf(ctx);
    if (stufe === 1) {
      if (ab === 1) return chooseRough(rng, stufe, ab, 'clear');
      if (ab === 2) return chooseRough(rng, stufe, ab, 'close');
      return rng.chance(0.5) ? chooseResult(rng, stufe, ab, method) : chooseTask(rng, stufe, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return roundInFields(rng, stufe, ab);
      if (ab === 2) return roughThenWritten(rng, stufe, ab, method);
      return rng.chance(0.5) ? chooseProbe(rng, stufe, ab) : probeWritten(rng, stufe, ab, method);
    }
    if (ab === 1) return calculateAgain(rng, stufe, ab, method);
    return ab === 2 ? whatHappened(rng, stufe, ab, method) : whichCannotBe(rng, stufe, ab, method);
  },
};
