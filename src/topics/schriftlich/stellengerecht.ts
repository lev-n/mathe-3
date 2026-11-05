import { speak } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, PlaceColumn, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { digitAt, numLength, placeName, placeDative, writtenVisual } from '../../core/written';
import { build, makeChoice, multiBugs, numberBugs, targetAb } from '../shared';
import { attempt, randLen, termOf } from './common';

const SKILL = { id: 'schriftlich.stellengerecht', topicId: 'schriftlich' } as const;
const KMK = ['ZO.schriftlich', 'ZO.stellenwert'];
const COLUMNS: PlaceColumn[] = ['T', 'H', 'Z', 'E'];
const LETTERS = ['A', 'B', 'C', 'D'];
const RULE = 'Einer unter Einer, Zehner unter Zehner.';

/** A row of the table: the number ends `shift` places left of the Einer. */
function row(n: number, shift: number): (number | null)[] {
  const values: (number | null)[] = COLUMNS.map(() => null);
  for (let p = 0; p < numLength(n); p++) values[COLUMNS.length - 1 - shift - p] = digitAt(n, p);
  return values;
}

/** Numbers in a Stellenwerttafel: shift[i] moves number i to the left. */
function table(numbers: readonly number[], shifts: readonly number[]): Visual {
  return { type: 'placeValue', columns: [...COLUMNS], rows: numbers.map((n, i) => ({ values: row(n, shifts[i]) })) };
}

const alignedVisual = (numbers: readonly number[], stufe: Stufe) =>
  writtenVisual({ type: 'written', op: 'add', operands: [...numbers], showSolution: false, places: stufe === 1 ? true : undefined });

/**
 * Options A, B, …: the letters follow the order on screen. On a phone every table stands in a row of its own, so a third table would push the first
 * one out of sight: at most 2 of them, and with 2 rows only.
 */
function lettered(rng: Rng, correct: Visual, wrongs: { visual: Visual; whyWrong: string }[]) {
  const shuffled = rng.shuffle([{ visual: correct, whyWrong: undefined as string | undefined }, ...wrongs]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({ label: LETTERS[i], visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  const at = shuffled.findIndex((o) => o.visual === correct);
  return { kind: 'choice' as const, options, correct: at, layout: 'grid' as const };
}

function steps(numbers: readonly number[], stufe: Stufe, lastLine: string) {
  const ones = numbers.map((n) => digitAt(n, 0)).join(', ');
  return [`Die letzte Ziffer jeder Zahl ist der Einer: ${ones}.`, 'Alle Einer stehen rechts genau untereinander.', { text: lastLine, visual: alignedVisual(numbers, stufe) }];
}

const HINTS = [RULE, 'Schau auf die letzte Ziffer jeder Zahl. Das sind die Einer.'];

function sameLengths(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 3);
      const b = randLen(rng, 3);
      return a + b <= 1000 ? [a, b] : null;
    },
    [378, 214],
  );
}

const allDifferent = (n: number) => new Set(String(n)).size === numLength(n);

/** Is this layout right? AB 1 of Stufe 1. */
function isItRight(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = sameLengths(rng);
  const term = termOf('add', [a, b]);
  const whyWrong = `Einer unter Einer. Die ${digitAt(b, 0)} gehört unter die ${digitAt(a, 0)}.`;
  const isRight = rng.chance(0.5);
  const visual = table([a, b], isRight ? [0, 0] : rng.pick([[0, 1], [1, 0]]));
  return build(SKILL, stufe, {
    key: `janein:${a}|${b}:${isRight}`,
    ab,
    prompt: 'Stehen die Zahlen richtig untereinander?',
    expression: term,
    visual,
    answer: makeChoice(rng, { label: isRight ? 'Ja' : 'Nein' }, [{ label: isRight ? 'Nein' : 'Ja', whyWrong: isRight ? 'Schau genau: Hier stehen Einer unter Einer.' : whyWrong }], { order: ['Ja', 'Nein'] }),
    hints: HINTS,
    steps: steps([a, b], stufe, `So steht ${term} richtig untereinander.`),
    praise: 'Du hast auf die Einer geschaut.',
    srText: `${speak(term)}. Stehen die Zahlen richtig untereinander?`,
    kmk: KMK,
  });
}

/** Which layout is right? AB 2 of Stufe 1. */
function chooseSame(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = sameLengths(rng);
  const term = termOf('add', [a, b]);
  const whyWrong = `Einer unter Einer. Die ${digitAt(b, 0)} gehört unter die ${digitAt(a, 0)}.`;
  const answer = lettered(rng, table([a, b], [0, 0]), [{ visual: table([a, b], rng.pick([[0, 1], [1, 0]])), whyWrong }]);
  return build(SKILL, stufe, {
    key: `wahl:${a}|${b}`,
    ab,
    prompt: 'Welche Rechnung steht richtig untereinander?',
    expression: term,
    answer,
    hints: HINTS,
    steps: steps([a, b], stufe, `So steht ${term} richtig untereinander.`),
    praise: 'Du hast Einer unter Einer gefunden.',
    srText: `${speak(term)}. Welche Rechnung steht richtig untereinander?`,
    kmk: KMK,
  });
}

/** Under which digit does this digit stand? Without a picture, at any place. AB 3 of Stufe 1. */
function underSame(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = attempt<[number, number]>(
    () => {
      const pair = sameLengths(rng);
      return pair.every(allDifferent) ? pair : null;
    },
    [378, 214],
  );
  return underItem(rng, stufe, ab, a, b, rng.int(0, 2), steps([a, b], stufe, `So steht ${termOf('add', [a, b])} richtig untereinander.`));
}

/** Under which digit of `a` does the digit of `b` at this place stand? */
function underItem(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number, place: number, worked: Step[]): Exercise {
  const term = termOf('add', [a, b]);
  const low = digitAt(b, place);
  // with 'Ziffer': the voice reads 'der 5.' as a date (spokenWords)
  const label = (d: number) => `unter der Ziffer ${d}`;
  const wrongs = [0, 1, 2].filter((p) => p !== place).map((p): ChoiceOption => ({ label: label(digitAt(a, p)), whyWrong: numLength(b) < numLength(a) ? `${RULE} Schreib die ${b} nach rechts.` : `${placeName(place)} stehen unter ${placeDative(place)}.` }));
  return build(SKILL, stufe, {
    key: `unter:${a}|${b}${place > 0 ? `:${place}` : ''}`,
    ab,
    prompt: `Schreib ${term} untereinander. Unter welcher Ziffer steht die ${low}?`,
    answer: makeChoice(rng, { label: label(digitAt(a, place)) }, wrongs),
    hints: [`Die ${low} ist der ${placeName(place)} von ${b}.`, `${placeName(place)} stehen unter ${placeDative(place)}. Welche Ziffer von ${a} ist der ${placeName(place)}?`],
    steps: worked,
    praise: `Du hast die passenden ${placeName(place)} gefunden.`,
    srText: `Schreib ${speak(term)} untereinander. Unter welcher Ziffer steht die ${low}?`,
    kmk: KMK,
  });
}

function differentLengths(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, 3);
      const b = randLen(rng, 2);
      if (a + b > 1000) return null;
      const da = [0, 1, 2].map((p) => digitAt(a, p));
      if (new Set(da).size < 3 || digitAt(b, 0) === digitAt(b, 1)) return null;
      return [a, b];
    },
    [587, 34],
  );
}

/** What the worked steps of a long and a short number say. */
function shortSteps(a: number, b: number, stufe: Stufe): Step[] {
  return [
    `Die ${digitAt(b, 0)} ist der Einer. Der Einer kommt unter die ${digitAt(a, 0)}.`,
    `Die ${digitAt(b, 1)} ist der Zehner. Der Zehner kommt unter die ${digitAt(a, 1)}.`,
    { text: `So steht ${termOf('add', [a, b])} richtig untereinander.`, visual: alignedVisual([a, b], stufe) },
  ];
}

/** 587 + 34: which layout is right? AB 1 of Stufe 2. */
function chooseShort(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = differentLengths(rng);
  const term = termOf('add', [a, b]);
  const moveRight = `${RULE} Schreib die ${b} nach rechts.`;
  const answer = lettered(rng, table([a, b], [0, 0]), [{ visual: table([a, b], rng.pick([[0, 1], [0, 2]])), whyWrong: moveRight }]);
  return build(SKILL, stufe, {
    key: `wahl2:${a}|${b}`,
    ab,
    prompt: 'Welche Rechnung steht richtig untereinander?',
    expression: term,
    answer,
    hints: HINTS,
    steps: shortSteps(a, b, stufe),
    praise: 'Du hast bei der kurzen Zahl auf die Einer geschaut.',
    srText: `${speak(term)}. Welche Rechnung steht richtig untereinander?`,
    kmk: KMK,
  });
}

/** 587 + 34: what stands under the digits of the long number? So the long number counts, not only the split of the short one. AB 2 of Stufe 2. */
function digitsInColumns(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = differentLengths(rng);
  const fields = [
    { id: 'z', value: digitAt(b, 1), before: `Unter der Ziffer ${digitAt(a, 1)}:`, label: `Unter der Ziffer ${digitAt(a, 1)}` },
    { id: 'e', value: digitAt(b, 0), before: `Unter der Ziffer ${digitAt(a, 0)}:`, label: `Unter der Ziffer ${digitAt(a, 0)}` },
  ];
  return build(SKILL, stufe, {
    key: `felder:${a}|${b}`,
    ab,
    prompt: `Schreib die ${b} unter die ${a}. Welche Ziffer steht wo?`,
    visual: { type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values: [digitAt(a, 2), digitAt(a, 1), digitAt(a, 0)] }] },
    answer: { kind: 'multi', fields },
    hints: [`Die ${b} hat nur Zehner und Einer.`, 'Die letzte Ziffer einer Zahl ist der Einer. Davor steht der Zehner.'],
    steps: shortSteps(a, b, stufe),
    bugs: multiBugs([{ id: 'nicht-stellengerecht', match: { z: digitAt(b, 0), e: digitAt(b, 1) }, hint: `${RULE} Die letzte Ziffer von ${b} ist der Einer.` }], fields),
    praise: 'Du hast jede Ziffer in ihre Spalte geschrieben.',
    srText: `Schreib die ${b} unter die ${a}. Welche Ziffer steht unter der Ziffer ${digitAt(a, 1)}, welche unter der Ziffer ${digitAt(a, 0)}?`,
    kmk: KMK,
  });
}

/** 587 + 34, without a picture: what stands under this digit of the long number? Under its Hunderter nothing stands. */
function belowLong(rng: Rng, stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const term = termOf('add', [a, b]);
  const place = rng.int(0, 2);
  const top = digitAt(a, place);
  const NOTHING = 'Keine Ziffer';
  const label = (p: number) => (p === 2 ? NOTHING : `Die Ziffer ${digitAt(b, p)}`);
  const wrongs = [0, 1, 2].filter((p) => p !== place).map((p): ChoiceOption => ({ label: label(p), whyWrong: `${RULE} Schreib die ${b} nach rechts.` }));
  const question = `Was steht unter der Ziffer ${top}?`;
  return build(SKILL, stufe, {
    key: `darunter:${a}|${b}:${place}`,
    ab,
    prompt: `Schreib ${term} untereinander. ${question}`,
    answer: makeChoice(rng, { label: label(place) }, wrongs),
    hints: [`Die ${top} ist der ${placeName(place)} von ${a}.`, `Hat die ${b} auch ${placeName(place)}?`],
    steps: shortSteps(a, b, stufe),
    praise: 'Du hast von oben nach unten gedacht.',
    srText: `Schreib ${speak(term)} untereinander. ${question}`,
    kmk: KMK,
  });
}

/** A long and a short number, read backwards and without a picture. AB 3 of Stufe 2. */
function shortReasoning(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b] = differentLengths(rng);
  return rng.chance(0.5) ? underItem(rng, stufe, ab, a, b, rng.int(0, 1), shortSteps(a, b, stufe)) : belowLong(rng, stufe, ab, a, b);
}

function threeNumbers(rng: Rng): [number, number, number] {
  return attempt<[number, number, number]>(
    () => {
      const lengths = rng.pick([[3, 2, 1], [3, 1, 2], [2, 3, 1], [3, 2, 2], [2, 1, 3]]);
      const ns = lengths.map((l) => randLen(rng, l)) as [number, number, number];
      // two equal numbers would both be the shortest: the two wrong layouts would match
      return ns.reduce((s, n) => s + n, 0) <= 1000 && new Set(ns).size === 3 ? ns : null;
    },
    [587, 34, 6],
  );
}

const NOBODY = 'Keine Zahl';

/** One table of three numbers: any of them can stand too far left, also the long one, or none. The table fits a phone with its options. AB 1 of Stufe 3. */
function whichIsOut(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const ns = threeNumbers(rng);
  const term = termOf('add', ns);
  const out = rng.chance(0.25) ? null : rng.pick(ns);
  const question = 'Prüfe die Spalte E. Welche Zahl steht zu weit links?';
  const wrongs = [...ns.filter((n) => n !== out).map((n): ChoiceOption => ({ label: String(n), whyWrong: `Die letzte Ziffer von ${n} steht in der Spalte E.` })), ...(out === null ? [] : [{ label: NOBODY, whyWrong: 'Schau auf die Spalte E: Dort fehlt eine Ziffer.' }])];
  return build(SKILL, stufe, {
    key: `welche:${ns.join('|')}:${out ?? 'keine'}`,
    ab,
    prompt: question,
    expression: term,
    visual: table(ns, ns.map((n) => (n === out ? 1 : 0))),
    answer: makeChoice(rng, { label: out === null ? NOBODY : String(out) }, wrongs, { order: [...ns.map(String), NOBODY] }),
    hints: ['Schau auf die Spalte E.', 'Jede Zahl hat dort ihre letzte Ziffer. Fehlt bei einer Zahl die Ziffer?'],
    steps: [out === null ? 'Alle 3 Zahlen stehen richtig.' : `Die ${out} steht zu weit links.`, 'Die letzte Ziffer jeder Zahl gehört in die Spalte E.', { text: `So steht ${term} richtig untereinander.`, visual: alignedVisual(ns, stufe) }],
    praise: 'Du hast die Spalte E Zahl für Zahl geprüft.',
    srText: `${speak(term)}. ${question}`,
    kmk: [...KMK, 'ZO.kontrolle'],
  });
}

/** The Zehner of the numbers that have one: 216, 39 and 7 have 1 and 3. */
const tensOf = (ns: readonly number[]) => ns.filter((n) => numLength(n) >= 2).map((n) => digitAt(n, 1));
/** The same column when the numbers stand left-aligned: the second digit from the left. */
const secondFromLeft = (ns: readonly number[]) => ns.filter((n) => numLength(n) >= 2).map((n) => digitAt(n, numLength(n) - 2));

const TENS_HINT = 'Der Zehner steht vor der letzten Ziffer.';

/** Three numbers, without a picture: which digits stand at the Zehner? AB 2 of Stufe 3. */
function tensOfThree(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const line = (digits: readonly number[]) => digits.join(', ');
  const { ns, rivals } = attempt<{ ns: [number, number, number]; rivals: string[] }>(
    () => {
      const three = threeNumbers(rng);
      const right = line(tensOf(three));
      const others = [line(secondFromLeft(three)), line(three.map((n) => digitAt(n, numLength(n) - 1))), line(three.map((n) => digitAt(n, 0)))].filter((text, i, all) => text !== right && all.indexOf(text) === i);
      return others.length >= 2 ? { ns: three, rivals: others } : null;
    },
    { ns: [587, 34, 6], rivals: ['8, 4', '5, 3, 6'] },
  );
  const term = termOf('add', ns);
  const question = 'Schreib die Zahlen untereinander. Welche Ziffern stehen bei den Zehnern?';
  const right = line(tensOf(ns));
  return build(SKILL, stufe, {
    key: `spalte:${ns.join('|')}`,
    ab,
    prompt: question,
    expression: term,
    answer: makeChoice(rng, { label: right }, rivals.map((label): ChoiceOption => ({ label, whyWrong: `${RULE} ${TENS_HINT}` }))),
    hints: [RULE, TENS_HINT],
    steps: [`Die letzte Ziffer jeder Zahl ist der Einer.`, `Davor steht der Zehner: ${right}.`, { text: `So steht ${term} richtig untereinander.`, visual: alignedVisual(ns, stufe) }],
    praise: 'Du hast in jeder Zahl den Zehner gefunden.',
    srText: `${speak(term)}. ${question}`,
    kmk: KMK,
  });
}

/** Three numbers, without a picture: line them up in the head and add one column. AB 3 of Stufe 3. */
function tensTogether(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const ns = attempt<[number, number, number]>(
    () => {
      const three = threeNumbers(rng);
      // 863 + 15 + 81 gives 15: the answer would stand in the task
      const together = tensOf(three).reduce((s, d) => s + d, 0);
      return tensOf(three).filter((d) => d > 0).length >= 2 && !three.includes(together) ? three : null;
    },
    [587, 34, 6],
  );
  const term = termOf('add', ns);
  const digits = tensOf(ns);
  const value = digits.reduce((s, d) => s + d, 0);
  const question = 'Schreib die Zahlen untereinander. Was ergeben die Zehner zusammen?';
  return build(SKILL, stufe, {
    key: `zehner:${ns.join('|')}`,
    ab,
    prompt: question,
    expression: term,
    answer: { kind: 'number', value, label: 'Zehner zusammen' },
    hints: [TENS_HINT, 'Nimm nur diese Ziffern und rechne sie zusammen.'],
    steps: [`Die Zehner sind ${digits.join(' und ')}.`, `${digits.join(' + ')} = ${value}`, { text: `So steht ${term} richtig untereinander: Die Zehner ergeben ${value}.`, visual: alignedVisual(ns, stufe) }],
    bugs: numberBugs([{ id: 'nicht-stellengerecht', match: secondFromLeft(ns).reduce((s, d) => s + d, 0), hint: `${RULE} ${TENS_HINT}` }], value),
    praise: 'Du hast die Zehner aller 3 Zahlen gerechnet.',
    srText: `${speak(term)}. ${question}`,
    kmk: KMK,
  });
}

export const stellengerechtSkill: SkillDef = {
  ...SKILL,
  title: 'Richtig untereinander',
  description: 'Du schreibst Einer unter Einer und Zehner unter Zehner.',
  stufen: {
    1: 'Zahlen mit 3 Ziffern untereinander',
    2: 'Eine lange und eine kurze Zahl',
    3: '3 Zahlen, verschieden lang; eine Zahl steht schief',
  },
  kmk: KMK,
  generate(rng: Rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    const forms = { 1: [isItRight, chooseSame, underSame], 2: [chooseShort, digitsInColumns, shortReasoning], 3: [whichIsOut, tensOfThree, tensTogether] }[stufe];
    return forms[ab - 1](rng, stufe, ab);
  },
};
