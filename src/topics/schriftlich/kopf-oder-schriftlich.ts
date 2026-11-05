import { MINUS, fmt, speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, SubtractionMethod, Visual } from '../../core/types';
import { digitAt, numLength } from '../../core/written';
import { build, bugList, makeChoice, multiBugs, targetAb } from '../shared';
import { attempt, carryCount, methodOf, randLen, solved, termOf } from './common';

const SKILL = { id: 'schriftlich.kopf-oder-schriftlich', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich', 'ZO.kopfrechnen'];

const HEAD = 'Im Kopf';
const WRITTEN = 'Schriftlich';

/** An empty Rechenstrich with the jumps of a mental way. */
function jumpsLine(start: number, stops: readonly number[], labels: readonly string[]): Visual {
  const values = [start, ...stops];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  return {
    type: 'numberLine',
    min,
    max: min + span,
    majorStep: span,
    minorStep: span,
    labelMajor: false,
    labels: values,
    jumps: stops.map((to, i) => ({ from: values[i], to, label: labels[i] })),
  };
}

/** 199 or 303: close to a full hundred, so the neighbour helps in the head (AB 2). */
const nearFullHundred = (n: number) => Math.min(n % 100, 100 - (n % 100)) <= 5;

/** A pair that really goes on paper: several Überträge, and none of the ways in the head. */
function messyPair(op: 'add' | 'sub', x: number, y: number): boolean {
  if (x === y || nearFullHundred(x) || nearFullHundred(y)) return false;
  if (op === 'add') return x + y < 1000 && (x + y) % 100 !== 0 && carryCount([x, y]) >= 2;
  return x - y >= 100 && (x - y) % 100 !== 0 && digitAt(x, 0) < digitAt(y, 0) && digitAt(x, 1) < digitAt(y, 1);
}

/** 400 + 300: full hundreds. */
function roundPair(rng: Rng, op: 'add' | 'sub'): [number, number] {
  return attempt<[number, number]>(
    () => {
      const x = rng.int(1, 9) * 100;
      const y = rng.int(1, 9) * 100;
      return op === 'add' ? (x + y <= 1000 ? [x, y] : null) : x > y ? [x, y] : null;
    },
    [400, 300],
  );
}

function hardPair(rng: Rng, op: 'add' | 'sub'): [number, number] {
  return attempt<[number, number]>(
    () => {
      const x = randLen(rng, 3);
      const y = randLen(rng, 3);
      return messyPair(op, x, y) ? [x, y] : null;
    },
    op === 'add' ? [478, 356] : [732, 458],
  );
}

/** The worked way of a pair of Stufe 1: the small task in the head, or the paper. */
function roundOrPaperSteps(op: 'add' | 'sub', a: number, b: number, round: boolean, method: SubtractionMethod, stufe: Stufe) {
  const term = termOf(op, [a, b]);
  const result = op === 'add' ? a + b : a - b;
  const small = `${a / 100} ${op === 'add' ? '+' : MINUS} ${b / 100} = ${result / 100}`;
  return round
    ? [`Kleine Aufgabe: ${small}.`, `Also: ${term} = ${fmt(result)}.`, 'Volle Hunderter rechnest du leicht im Kopf.']
    : ['Hier gibt es mehrere Überträge.', { text: `Auf Papier: ${term} = ${fmt(result)}.`, visual: solved(op, [a, b], method, stufe) }];
}

/** Stufe 1, AB 1: round numbers go in the head; a messy pair goes on paper. */
function headOrPaper(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const round = rng.chance(0.6);
  const op = rng.chance(0.6) ? 'add' : 'sub';
  const [a, b] = round ? roundPair(rng, op) : hardPair(rng, op);
  const term = termOf(op, [a, b]);
  return build(SKILL, stufe, {
    key: `weg:${op}:${a}|${b}`,
    ab,
    prompt: 'Welcher Weg ist hier leichter?',
    expression: term,
    answer: makeChoice(
      rng,
      { label: round ? HEAD : WRITTEN },
      [{ label: round ? WRITTEN : HEAD, whyWrong: round ? 'Das geht auch auf Papier. Hier reichen dir volle Hunderter im Kopf.' : 'Das geht auch im Kopf. Mit vielen Überträgen hilft dir das Papier.' }],
      { order: [HEAD, WRITTEN] },
    ),
    hints: ['Schau dir die Zahlen an: Sind es volle Hunderter?', round ? 'Kennst du die kleine Aufgabe dazu?' : 'Musst du mehrmals einen Übertrag merken?'],
    steps: roundOrPaperSteps(op, a, b, round, method, stufe),
    praise: 'Du hast dir zuerst die Zahlen angeschaut.',
    srText: `${speak(term)}. Welcher Weg ist hier leichter?`,
    kmk: KMK,
  });
}

/** Stufe 1, AB 2: of three tasks, one goes in the head. */
function findEasy(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const op = rng.chance(0.6) ? 'add' : 'sub';
  const [a, b] = roundPair(rng, op);
  const term = termOf(op, [a, b]);
  const seen = new Set<string>();
  const rivals = attempt<string[]>(
    () => {
      const other = rng.chance(0.5) ? 'add' : 'sub';
      const label = termOf(other, hardPair(rng, other));
      seen.add(label);
      return seen.size === 2 ? [...seen] : null;
    },
    ['478 + 356', `732 ${MINUS} 458`],
  );
  const prompt = 'Welche Aufgabe rechnest du leicht im Kopf?';
  return build(SKILL, stufe, {
    key: `leicht:${op}:${a}|${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: term }, rivals.map((label): ChoiceOption => ({ label, whyWrong: 'Hier hilft dir das Papier. Such die vollen Hunderter.' }))),
    hints: ['Schau bei jeder Aufgabe auf die Einer und Zehner.', 'Volle Hunderter haben dort nur Nullen.'],
    steps: roundOrPaperSteps(op, a, b, true, method, stufe),
    praise: 'Du hast die Aufgabe mit den vollen Hundertern gefunden.',
    srText: prompt,
    kmk: KMK,
  });
}

/** Stufe 1, AB 3: why is this way the easier one? */
function whyThisWay(rng: Rng, stufe: Stufe, ab: Ab, method: SubtractionMethod): Exercise {
  const round = rng.chance(0.5);
  const op = rng.chance(0.6) ? 'add' : 'sub';
  const [a, b] = round ? roundPair(rng, op) : hardPair(rng, op);
  const term = termOf(op, [a, b]);
  const FULL = 'Es sind volle Hunderter.';
  const CARRIES = 'Es gibt mehrere Überträge.';
  const ONE = 'Die Zahlen haben nur 1 Ziffer.';
  const question = round ? 'Warum geht diese Aufgabe leicht im Kopf?' : 'Warum hilft bei dieser Aufgabe das Papier?';
  const wrongs: ChoiceOption[] = [
    round ? { label: CARRIES, whyWrong: 'Bei den Einern und Zehnern steht nur 0. Dort gibt es keinen Übertrag.' } : { label: FULL, whyWrong: 'Schau auf die Einer und Zehner. Dort steht nicht nur 0.' },
    { label: ONE, whyWrong: 'Die Zahlen haben 3 Ziffern. Schau auf die Einer und Zehner.' },
  ];
  return build(SKILL, stufe, {
    key: `warum:${op}:${a}|${b}`,
    ab,
    prompt: question,
    expression: term,
    answer: makeChoice(rng, { label: round ? FULL : CARRIES }, wrongs),
    hints: ['Schau zuerst auf die Einer und Zehner.', 'Musst du dir beim Rechnen etwas merken?'],
    steps: roundOrPaperSteps(op, a, b, round, method, stufe),
    praise: 'Du hast den Grund für deinen Weg gefunden.',
    srText: `${speak(term)}. ${question}`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** 356 + 199: near a full hundred. AB 1 chooses the way, AB 2 calculates with the neighbour, AB 3 writes each step of the way. */
function nearHundred(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const plus = rng.chance(0.6);
  const [a, off, far] = attempt<[number, number, number]>(
    () => {
      const hundreds = rng.int(1, 4) * 100;
      const miss = rng.pick([1, 2, 1]);
      const x = randLen(rng, 3);
      if (x % 10 === 0) return null;
      if (plus) return x + hundreds <= 1000 ? [x, miss, hundreds] : null;
      return x - hundreds >= 100 && x - hundreds + miss !== hundreds ? [x, miss, hundreds] : null;
    },
    [356, 1, 200],
  );
  const b = far - off;
  const value = plus ? a + b : a - b;
  const sign = plus ? '+' : MINUS;
  const back = plus ? MINUS : '+';
  const term = `${fmt(a)} ${sign} ${fmt(b)}`;
  const way = `${fmt(a)} ${sign} ${fmt(far)} ${back} ${off}`;
  const middle = plus ? a + far : a - far;
  const line = jumpsLine(a, [middle, value], [`${sign} ${fmt(far)}`, `${back} ${off}`]);
  const steps = [
    `${fmt(b)} liegt nah bei ${fmt(far)}.`,
    { text: `${fmt(a)} ${sign} ${fmt(far)} = ${fmt(middle)}.`, visual: line },
    `${fmt(middle)} ${back} ${off} = ${fmt(value)}.`,
  ];
  const hints = [`${fmt(b)} liegt nah bei ${fmt(far)}.`, `Rechne erst mit ${fmt(far)}. Dann gleichst du ${off} aus.`];
  if (ab === 1) {
    const wrongs: ChoiceOption[] = [
      { label: `${fmt(a)} ${sign} ${fmt(far)} ${sign} ${off}`, whyWrong: `Du hast zu viel genommen. Gleiche ${off} wieder aus.` },
      { label: `${fmt(a)} ${sign} ${fmt(far + 100)} ${back} ${off}`, whyWrong: `Schau genau: ${fmt(b)} liegt nah bei ${fmt(far)}.` },
    ];
    return build(SKILL, stufe, {
      key: `wahl:${plus ? 'p' : 'm'}:${a}|${b}`,
      ab,
      prompt: 'Das geht leicht im Kopf. Welcher Weg passt?',
      expression: term,
      answer: makeChoice(rng, { label: way }, wrongs),
      hints,
      steps,
      praise: 'Du hast die volle Nachbarzahl genutzt.',
      srText: `${speak(term)}. Das geht leicht im Kopf. Welcher Weg passt?`,
      kmk: KMK,
    });
  }
  if (ab === 3) {
    const fields = [
      { id: 'far', value: far, before: `${fmt(a)} ${sign}`, label: 'Volle Zahl' },
      { id: 'off', value: off, before: back, label: 'Ausgleich' },
      { id: 'r', value, before: '=', label: 'Ergebnis' },
    ];
    const prompt = 'Rechne im Kopf mit der vollen Nachbarzahl. Schreib jeden Schritt auf.';
    return build(SKILL, stufe, {
      key: `schritte:${plus ? 'p' : 'm'}:${a}|${b}`,
      ab,
      prompt,
      expression: term,
      answer: { kind: 'multi', fields },
      hints: [`Welche volle Zahl liegt nah bei ${fmt(b)}?`, 'Rechne erst mit der vollen Zahl. Gleiche dann aus.'],
      steps: [`${fmt(b)} liegt nah bei ${fmt(far)}.`, { text: `${fmt(a)} ${sign} ${fmt(far)} = ${fmt(middle)}.`, visual: line }, `Also: ${way} = ${fmt(value)}.`],
      bugs: multiBugs(
        [
          { id: 'nachbar-vergessen', match: { r: middle }, hint: `Du hast mit der vollen Zahl gerechnet. Gleiche jetzt noch ${off} aus.` },
          { id: 'nachbar-richtung', match: { r: plus ? middle + off : middle - off }, hint: `Du hast zu viel genommen. Gleiche ${off} in die andere Richtung aus.` },
        ],
        fields,
      ),
      praise: 'Du hast den Weg über die volle Zahl aufgeschrieben.',
      srText: `${speak(term)}. ${prompt}`,
      kmk: KMK,
    });
  }
  return build(SKILL, stufe, {
    key: `rechnen:${plus ? 'p' : 'm'}:${a}|${b}`,
    ab,
    prompt: 'Rechne im Kopf mit der vollen Nachbarzahl.',
    expression: `${term} = □`,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints,
    steps,
    bugs: bugList(value, [
      ['nachbar-vergessen', middle, `Du hast mit ${fmt(far)} gerechnet. Gleiche jetzt noch ${off} aus.`],
      ['nachbar-richtung', plus ? middle + off : middle - off, `Du hast zu viel genommen. Gleiche ${off} in die andere Richtung aus.`],
    ]),
    praise: 'Du hast erst die volle Zahl gerechnet und dann ausgeglichen.',
    srText: `${speak(term)}. Rechne im Kopf mit der vollen Nachbarzahl.`,
    kmk: KMK,
  });
}

/** 1000 − 233 or 800 − 257: many zeros above. */
function zeroRichPair(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = rng.chance(0.6) ? 1000 : rng.int(3, 9) * 100;
      const b = randLen(rng, 3);
      return a - b >= 100 && digitAt(b, 0) !== 0 && digitAt(b, 1) !== 0 ? [a, b] : null;
    },
    [1000, 233],
  );
}

const firstLine = (nines: number, b: number, easier: number) => `${fmt(nines)} ${MINUS} ${fmt(b)} geht ohne Übertrag: ${fmt(easier)}.`;

const SAME = 'Beide Wege geben dasselbe Ergebnis.';
const fewer = (diff: number) => `Der zweite Weg gibt ${diff} weniger.`;
const more = (diff: number) => `Der zweite Weg gibt ${diff} mehr.`;

/** Stufe 3: the shared worked way from the number 1 below the full one. */
function fromNines(a: number, b: number) {
  const value = a - b;
  const nines = a - 1;
  const easier = nines - b;
  return {
    value,
    nines,
    easier,
    steps: [
      firstLine(nines, b, easier),
      `Du hast mit 1 weniger gerechnet. Also noch + 1.`,
      { text: `${fmt(easier)} + 1 = ${fmt(value)}.`, visual: jumpsLine(b, [a], [`+ ${fmt(value)}`]) },
    ],
  };
}

/** Stufe 3, AB 1 with the way in the task; AB 2 without it, so that the child finds the way. Both calculate: a way to tap would need no number. */
const fromFull = (withWay: boolean) => (rng: Rng, stufe: Stufe, ab: Ab): Exercise => {
  const [a, b] = zeroRichPair(rng);
  const term = termOf('sub', [a, b]);
  const { value, nines, easier, steps } = fromNines(a, b);
  const hundreds = Math.floor(a / 100);
  // every column on its own, each digit up to 10: 1000 − 233 as 877
  const allToTen = (10 - digitAt(b, 0)) + (10 - digitAt(b, 1)) * 10 + (hundreds - digitAt(b, 2)) * 100;
  const prompt = withWay ? `Rechne im Kopf. Rechne erst von ${fmt(nines)} aus.` : 'Rechne im Kopf. Such dir einen leichten Weg.';
  return build(SKILL, stufe, {
    key: `${withWay ? 'rechnen' : 'frei'}:${a}|${b}`,
    ab,
    prompt,
    expression: `${term} = □`,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: withWay ? [`Von ${fmt(nines)} geht es ohne Übertrag.`, `${fmt(nines)} ist 1 weniger als ${fmt(a)}. Dann rechne noch + 1.`] : ['Oben stehen viele Nullen. Welche Zahl daneben hat keine Null?', `Von ${fmt(nines)} geht es ohne Übertrag.`],
    steps,
    bugs: bugList(value, [
      ['ergaenzen-1000', allToTen, numLength(a) === 4 ? 'Bis zur 1000: Bei den Hundertern und Zehnern geht es bis 9.' : 'Bei den Zehnern geht es nur bis 9. Bei den Einern bis 10.'],
      ['nachbar-vergessen', easier, `Du hast mit 1 weniger gerechnet. Rechne noch + 1.`],
    ]),
    praise: withWay ? 'Du hast den Weg ohne Übertrag genommen.' : 'Du hast dir selbst einen leichten Weg gesucht.',
    srText: `${speak(term)}. ${prompt}`,
    kmk: KMK,
  });
};

/**
 * What the second way of a comparison starts with: 1 less on top (999 − 346), or a full lower number (1000 − 350). `unit` is what it takes away too much,
 * so the difference has to be worked out from the numbers. No look at the end of the way alone decides.
 */
function secondWay(rng: Rng, a: number, b: number) {
  const nines = rng.chance(0.5);
  const full = Math.ceil(b / 10) * 10;
  const unit = nines ? 1 : full - b;
  const start = nines ? `${fmt(a - 1)} ${MINUS} ${fmt(b)}` : `${fmt(a)} ${MINUS} ${fmt(full)}`;
  const first = nines ? a - 1 - b : a - full;
  return { nines, full, unit, start, first };
}

/** Stufe 3, AB 3: compare two ways. The second way can start and end in several ways, so the answer depends on its numbers. */
function compareWays(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = zeroRichPair(rng);
  const term = termOf('sub', [a, b]);
  const value = a - b;
  const { nines, full, unit, start, first } = secondWay(rng, a, b);
  const { key, end, times } = rng.pick([
    { key: 'gleich', end: ` + ${unit}`, times: 0 },
    { key: 'weniger1', end: '', times: 1 },
    { key: 'weniger2', end: ` ${MINUS} ${unit}`, times: 2 },
  ]);
  const diff = times * unit;
  const second = `${start}${end}`;
  const both = `${term}   und   ${second}`;
  const right = diff === 0 ? SAME : fewer(diff);
  const tooMuch = nines ? 'Der zweite Weg startet mit 1 weniger. Schau auf sein Ende.' : `Der zweite Weg nimmt ${unit} zu viel weg. Schau auf sein Ende.`;
  const wrongs = [SAME, fewer(unit), fewer(2 * unit), more(unit)].filter((l) => l !== right).map((label): ChoiceOption => ({ label, whyWrong: tooMuch }));
  const afterFirst = `${start} = ${fmt(first)}.`;
  const lastLine = `Der erste Weg gibt ${fmt(value)}. Der zweite Weg gibt ${fmt(value - diff)}.`;
  const middle = diff === 0 ? `${fmt(first)} + ${unit} = ${fmt(value)}.` : times === 1 ? 'Danach kommt nichts dazu.' : `${fmt(first)} ${MINUS} ${unit} = ${fmt(value - diff)}.`;
  return build(SKILL, stufe, {
    key: `vergleich:${a}|${b}:${nines ? 'n' : 'v'}:${key}`,
    ab,
    prompt: 'Vergleiche die 2 Wege. Was stimmt?',
    expression: both,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: [nines ? `Der zweite Weg startet mit ${fmt(a - 1)}. Das ist 1 weniger.` : `Der zweite Weg nimmt ${fmt(full)} weg. Das sind ${unit} zu viel.`, 'Schau auf das Ende: Was kommt dort dazu, was geht weg?'],
    steps: [afterFirst, middle, lastLine],
    praise: 'Du hast die 2 Wege verglichen.',
    srText: `${speak(term)} und ${speak(second)}. Vergleiche die 2 Wege. Was stimmt?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

export const kopfOderSchriftlichSkill: SkillDef = {
  ...SKILL,
  title: 'Im Kopf oder schriftlich?',
  description: 'Du entscheidest, welcher Weg hier leichter ist.',
  stufen: {
    1: 'Volle Hunderter im Kopf, schwere Zahlen auf Papier',
    2: 'Nah am vollen Hunderter: wählen und rechnen',
    3: 'Viele Nullen: 2 Wege vergleichen',
  },
  kmk: KMK,
  // the worked solution of a minus task on paper shows the method
  usesMethod: true,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const method = methodOf(ctx);
    if (stufe === 1) {
      if (ab === 1) return headOrPaper(rng, stufe, ab, method);
      return ab === 2 ? findEasy(rng, stufe, ab, method) : whyThisWay(rng, stufe, ab, method);
    }
    if (stufe === 2) return nearHundred(rng, stufe, ab);
    if (ab === 1) return fromFull(true)(rng, stufe, ab);
    return ab === 2 ? fromFull(false)(rng, stufe, ab) : compareWays(rng, stufe, ab);
  },
};
