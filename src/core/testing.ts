/**
 * Shared invariant suite for exercise generators. Only imported by *.test.ts files.
 *
 * Usage in a topic test:
 *   import { describeSkill } from '../../core/testing';
 *   describeSkill(zerlegenSkill, { minDistinct: 30 });
 */
import { describe, expect, it } from 'vitest';
import { ALL_FACT_KEYS, factSkillId, isFactKey } from '../state/facts';
import { MAX_CHOICE_OPTIONS, MAX_CONVERTED_NUMBER, MAX_MULTI_FIELDS, MAX_NUMBER, MAX_ORDER_ITEMS } from './age';
import { checkAnswer, correctResponse, responseForBug } from './check';
import { fmt } from './format';
import { createRng } from './rng';
import { clauseProblems, fachwortProblems, hintProblems, longWordProblems, methodWordProblems, numberFormatProblems, numberWordProblems, NUMBER_WORD_SKILLS, passiveProblems, praiseAndStepProblems, pronounProblems, questionProblems, restProblems, taskTextProblems } from './textRules';
import { isKmkTag } from '../data/curriculum';
import type { Ab, Answer, Exercise, GenContext, SkillDef, Step, Stufe, Visual } from './types';
import { STUFEN } from './types';

export { wordCount, sentences } from './textRules';

/** Phrases that must never appear (docs/research.md §6.4 and M15). Matched case-insensitively as whole words. */
export const BANNED_PHRASES = [
  'falsch', 'leider', 'konzentrier', 'schlau', 'genie', 'naturtalent', 'perfekt', 'unglaublich', 'fantastisch',
  'weltklasse', 'zu langsam', 'so schnell', 'schon wieder', 'war doch einfach', 'alle anderen',
];

/**
 * Extra traps of improvement praise (docs/research.md M15 "Verbesserung", M16): pressure, inflation, comparison
 * with others and error framing. Checked on every improvement text (round notes, progress view, badges).
 */
export const IMPROVEMENT_BANNED_PHRASES = [
  ...BANNED_PHRASES,
  'endlich', 'na also', 'besser als', 'andere kinder', 'viel besser', 'keine fehler', 'nie wieder', 'fehlerfrei',
];

/** Whole number `shown` in `text`, not as a part of a longer number. */
function mentions(text: string, shown: string): boolean {
  return new RegExp(`(?<!\\d)${shown}(?!\\d)`).test(text);
}

const CONTEXTS: GenContext[] = [
  { subtractionMethod: 'abziehen', extras: false, today: '2026-10-19' },
  { subtractionMethod: 'ergaenzen', extras: true, today: '2026-10-19' },
];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function allNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allNumbers(v, out));
  return out;
}

/** Answer limits for this age (docs/research.md §7.1, §2.2). */
export function assertAnswerLimits(answer: Answer, stufe: Stufe): void {
  switch (answer.kind) {
    case 'number':
      if (answer.offerUnsolvable) expect(stufe, '"Nicht lösbar" only on Stufe 3 (F17)').toBe(3);
      expect(answer.decimals ?? 0, 'at most 2 decimal places').toBeLessThanOrEqual(2);
      break;
    case 'written':
      expect(answer.operands.length, 'written: at most 3 numbers').toBeLessThanOrEqual(3);
      answer.operands.forEach((o) => expect(o, 'written: numbers up to 1000').toBeLessThanOrEqual(MAX_NUMBER));
      expect(answer.result, `written: results up to ${MAX_NUMBER}`).toBeLessThanOrEqual(MAX_NUMBER);
      if (answer.op === 'mul') expect(answer.operands[1], 'written mal: a one-digit second factor').toBeLessThanOrEqual(9);
      break;
    case 'choice':
      expect(answer.options.length, `at most ${MAX_CHOICE_OPTIONS[stufe]} options on Stufe ${stufe}`).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS[stufe]);
      break;
    case 'order':
      expect(answer.items.length, `order: at most ${MAX_ORDER_ITEMS} items`).toBeLessThanOrEqual(MAX_ORDER_ITEMS);
      break;
    case 'multi':
      expect(answer.fields.length, `multi: at most ${MAX_MULTI_FIELDS} fields`).toBeLessThanOrEqual(MAX_MULTI_FIELDS);
      answer.fields.forEach((f) => expect(f.decimals ?? 0, 'at most 2 decimal places').toBeLessThanOrEqual(2));
      break;
    case 'numberline':
      expect(answer.min, 'number line below 0').toBeGreaterThanOrEqual(0);
      expect(answer.max, 'number line above its range').toBeLessThanOrEqual(answer.time ? MINUTES_OF_DAY : MAX_NUMBER);
      break;
    case 'cells':
      // 6 columns of 49 px fit a 375 px phone (src/ui/answers/CellsInput.css)
      expect(answer.width, 'cells: at most 6 columns').toBeLessThanOrEqual(6);
      expect(answer.height, 'cells: at most 6 rows').toBeLessThanOrEqual(6);
      break;
    default:
      break;
  }
}

/** A value has no more decimal places than the item allows. */
function fitsDecimals(value: number, decimals = 0): boolean {
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export function assertWellFormedAnswer(answer: Answer): void {
  switch (answer.kind) {
    case 'number':
      if (answer.value === null) expect(answer.offerUnsolvable, 'value null requires offerUnsolvable').toBe(true);
      else expect(Number.isFinite(answer.value)).toBe(true);
      if (answer.value !== null) expect(fitsDecimals(answer.value, answer.decimals), `${answer.value} with ${answer.decimals ?? 0} decimal places`).toBe(true);
      break;
    case 'choice': {
      expect(answer.options.length).toBeGreaterThanOrEqual(2);
      expect(answer.options.length).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS[3]);
      expect(answer.correct).toBeGreaterThanOrEqual(0);
      expect(answer.correct).toBeLessThan(answer.options.length);
      const labels = answer.options.map((o) => o.label + JSON.stringify(o.visual ?? null));
      expect(new Set(labels).size, `duplicate choice options: ${labels.join(' | ')}`).toBe(labels.length);
      expect(answer.options[answer.correct].whyWrong, 'correct option must not have whyWrong').toBeUndefined();
      break;
    }
    case 'multi': {
      expect(answer.fields.length).toBeGreaterThanOrEqual(1);
      expect(new Set(answer.fields.map((f) => f.id)).size).toBe(answer.fields.length);
      for (const f of answer.fields) {
        expect(Number.isFinite(f.value)).toBe(true);
        expect(fitsDecimals(f.value, f.decimals), `${f.value} with ${f.decimals ?? 0} decimal places`).toBe(true);
      }
      break;
    }
    case 'written': {
      const ops = answer.operands;
      ops.forEach((o) => expect(Number.isInteger(o) && o >= 0, `operand ${o}`).toBe(true));
      if (answer.op === 'add') {
        expect(ops.length).toBeGreaterThanOrEqual(2);
        expect(answer.result).toBe(ops.reduce((a, b) => a + b, 0));
      } else if (answer.op === 'sub') {
        expect(ops.length).toBe(2);
        expect(answer.result).toBe(ops[0] - ops[1]);
        expect(answer.result).toBeGreaterThanOrEqual(0);
      } else {
        expect(ops.length).toBe(2);
        expect(answer.result).toBe(ops[0] * ops[1]);
      }
      break;
    }
    case 'cells': {
      const inside = (c: readonly [number, number]) => c[0] >= 0 && c[1] >= 0 && c[0] < answer.width && c[1] < answer.height;
      answer.given.forEach((c) => expect(inside(c)).toBe(true));
      answer.solution.forEach((c) => expect(inside(c)).toBe(true));
      expect(answer.solution.length).toBeGreaterThan(0);
      const given = new Set(answer.given.map((c) => c.join()));
      answer.solution.forEach((c) => expect(given.has(c.join()), 'solution overlaps given').toBe(false));
      break;
    }
    case 'numberline':
      expect(answer.value).toBeGreaterThanOrEqual(answer.min);
      expect(answer.value).toBeLessThanOrEqual(answer.max);
      expect(answer.step).toBeGreaterThan(0);
      expect(answer.max).toBeGreaterThan(answer.min);
      expect(Math.abs(((answer.value - answer.min) / answer.step) - Math.round((answer.value - answer.min) / answer.step))).toBeLessThan(1e-9);
      break;
    case 'order': {
      expect(answer.items.length).toBeGreaterThanOrEqual(2);
      expect([...answer.correct].sort((a, b) => a - b)).toEqual(answer.items.map((_, i) => i));
      break;
    }
  }
}

const inRange = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** A numberLine with `time` counts minutes since midnight. */
const MINUTES_OF_DAY = 24 * 60;

/** Coins and notes of the Klasse-3 range, in Cent (1 ct to 100 €). */
const MONEY_ITEMS: ReadonlySet<number> = new Set([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]);

/** Clock minutes by level (§6 groessen.uhr): five-minute steps at level 1, exact minutes from level 2. */
function clockMinutesAllowed(minutes: number, level: 1 | 2 | 3): boolean {
  return level >= 2 || minutes % 5 === 0;
}

/**
 * A visual is complete and fits Klasse 3. `level` (the larger of Stufe and AB of the exercise, default 3) decides what the clock may show.
 */
export function assertWellFormedVisual(v: Visual, level: 1 | 2 | 3 = 3): void {
  switch (v.type) {
    case 'placeValue':
      if (v.headers) expect(v.headers.length, 'one header per column').toBe(v.columns.length);
      v.rows.forEach((r) => {
        expect(r.values.length).toBe(v.columns.length);
        // 3 H 14 Z is a bundling task, so a cell may hold more than one digit.
        r.values.forEach((x) => expect(x === null || inRange(x, 0, MAX_NUMBER), `place value cell ${x}`).toBe(true));
      });
      break;
    case 'numberLine':
      expect(v.max).toBeGreaterThan(v.min);
      expect(v.min, 'number line below 0').toBeGreaterThanOrEqual(0);
      expect(v.max, 'number line above its range').toBeLessThanOrEqual(v.time ? MINUTES_OF_DAY : MAX_NUMBER);
      expect(v.minorStep).toBeGreaterThan(0);
      expect((v.max - v.min) / v.minorStep, 'too many ticks').toBeLessThanOrEqual(100);
      (v.marks ?? []).forEach((m) => {
        expect(m.value).toBeGreaterThanOrEqual(v.min);
        expect(m.value).toBeLessThanOrEqual(v.max);
      });
      (v.jumps ?? []).forEach((j) => {
        expect(inRange(j.from, v.min, v.max), `jump from ${j.from}`).toBe(true);
        expect(inRange(j.to, v.min, v.max), `jump to ${j.to}`).toBe(true);
        expect(j.from, 'a jump goes somewhere').not.toBe(j.to);
      });
      break;
    case 'baseTen': {
      expect(inRange(v.hundreds ?? 0, 0, 10), `baseTen hundreds ${v.hundreds}`).toBe(true);
      expect(inRange(v.tens, 0, 19), `baseTen tens ${v.tens}`).toBe(true);
      expect(inRange(v.ones, 0, 19), `baseTen ones ${v.ones}`).toBe(true);
      const moreHundreds = v.second?.hundreds ?? 0;
      const moreTens = v.second?.tens ?? 0;
      const moreOnes = v.second?.ones ?? 0;
      if (v.second?.mode === 'weg') {
        expect(moreHundreds, 'baseTen: crossed out more plates than drawn').toBeLessThanOrEqual(v.hundreds ?? 0);
        expect(moreTens, 'baseTen: crossed out more sticks than drawn').toBeLessThanOrEqual(v.tens);
        expect(moreOnes, 'baseTen: crossed out more cubes than drawn').toBeLessThanOrEqual(v.ones);
      }
      const shown = (v.hundreds ?? 0) * 100 + v.tens * 10 + v.ones;
      const total = shown + (v.second?.mode === 'dazu' ? moreHundreds * 100 + moreTens * 10 + moreOnes : 0);
      expect(total, `baseTen shows ${total}`).toBeLessThanOrEqual(MAX_NUMBER);
      break;
    }
    case 'hundredChart': {
      const first = v.start;
      expect(first % 100, `a page starts at x01: ${first}`).toBe(1);
      expect(inRange(first, 1, 901), `page from ${first}`).toBe(true);
      const cell = (n: number) => expect(inRange(n, first, first + 99), `hundred chart cell ${n}`).toBe(true);
      (v.masked ?? []).forEach(cell);
      (v.marked ?? []).forEach(cell);
      (v.piece ?? []).forEach(cell);
      (v.replaced ?? []).forEach((r) => cell(r.cell));
      if (v.piece) {
        expect(v.piece.length, 'a cut-out piece has at most 16 cells').toBeLessThanOrEqual(16);
        // a piece hangs together: every cell has a neighbour in the piece
        const touches = (a: number, b: number) => Math.abs(a - b) === 10 || (Math.abs(a - b) === 1 && Math.floor((a - 1) / 10) === Math.floor((b - 1) / 10));
        if (v.piece.length > 1) v.piece.forEach((n) => expect(v.piece!.some((m) => touches(n, m)), `piece cell ${n} hangs alone`).toBe(true));
        (v.masked ?? []).forEach((n) => expect(v.piece, `masked cell ${n} outside the piece`).toContain(n));
      }
      break;
    }
    case 'dotArray':
      if ('groups' in v) {
        expect(v.groups.length).toBeGreaterThanOrEqual(1);
        v.groups.forEach((g) => expect(inRange(g, 1, 20), `group of ${g}`).toBe(true));
        expect(v.groups.reduce((a, b) => a + b, 0), 'more than 100 dots').toBeLessThanOrEqual(100);
      } else {
        expect(inRange(v.rows, 1, 10), `dot rows ${v.rows}`).toBe(true);
        expect(inRange(v.cols, 1, 10), `dot columns ${v.cols}`).toBe(true);
      }
      break;
    case 'barChart':
    case 'pictogram':
      expect(v.values.length).toBe(v.categories.length);
      v.values.forEach((x) => expect(inRange(x, 0, MAX_NUMBER), `data value ${x}`).toBe(true));
      break;
    case 'tally':
      v.rows.forEach((r) => expect(inRange(r.count, 0, 50), `tally count ${r.count}`).toBe(true));
      break;
    case 'table':
      v.rows.forEach((r) => expect(r.length, 'table row length').toBe(v.header.length));
      expect(v.header.length, 'at most 6 columns fit a phone').toBeLessThanOrEqual(6);
      break;
    case 'grid':
      [...v.cells, ...(v.halfCells ?? []).map((h) => h.cell)].forEach((c) => {
        expect(c[0]).toBeLessThan(v.width);
        expect(c[1]).toBeLessThan(v.height);
      });
      (v.labels ?? []).forEach((l) => {
        expect(l.cell[0]).toBeLessThan(v.width);
        expect(l.cell[1]).toBeLessThan(v.height);
      });
      break;
    case 'shapeRow':
      expect(v.items.length).toBeGreaterThanOrEqual(1);
      break;
    case 'clock':
      expect(v.hours).toBeGreaterThanOrEqual(0);
      expect(v.hours).toBeLessThan(24);
      expect(v.minutes).toBeGreaterThanOrEqual(0);
      expect(v.minutes).toBeLessThan(60);
      expect(clockMinutesAllowed(v.minutes, level), `clock at minute ${v.minutes} on level ${level}`).toBe(true);
      break;
    case 'money':
      v.items.forEach((c) => expect(MONEY_ITEMS.has(c), `no such coin or note in Klasse 3: ${c} ct`).toBe(true));
      expect(v.items.length, 'too many pieces for a phone and a worksheet').toBeLessThanOrEqual(12);
      break;
    case 'ruler': {
      const from = (v.minCm ?? 0) * 10;
      expect(inRange(v.maxCm, 1, 30), `ruler to ${v.maxCm} cm`).toBe(true);
      expect(inRange(from, 0, v.maxCm * 10 - 10), `ruler from ${from} mm`).toBe(true);
      for (const b of [v, ...(v.second ? [v.second] : [])]) {
        expect(inRange(b.startMm, from, v.maxCm * 10), `object starts at ${b.startMm} mm`).toBe(true);
        expect(inRange(b.startMm + b.lengthMm, from, v.maxCm * 10), `object ends at ${b.startMm + b.lengthMm} mm`).toBe(true);
        expect(b.lengthMm, 'an object has a length').toBeGreaterThan(0);
      }
      break;
    }
    case 'written':
      expect(v.operands.length).toBeGreaterThanOrEqual(2);
      expect(v.operands.length, 'written: at most 3 numbers').toBeLessThanOrEqual(3);
      v.operands.forEach((o) => expect(inRange(o, 0, MAX_NUMBER), `written operand ${o}`).toBe(true));
      if (v.op === 'sub') expect(v.operands[0]).toBeGreaterThanOrEqual(v.operands[1]);
      if (v.op === 'mul') expect(v.operands[1], 'written mal: a one-digit second factor').toBeLessThanOrEqual(9);
      break;
    case 'net':
      expect(v.cells.length, 'a net has 6 squares, a Quadernetz up to 16').toBeGreaterThanOrEqual(6);
      expect(v.cells.length).toBeLessThanOrEqual(16);
      if (v.faces) expect(v.faces.length).toBe(v.cells.length);
      break;
    case 'tree':
      expect(v.levels.length, 'a tree has at most 3 levels (§6: 3 · 3 · 2)').toBeLessThanOrEqual(3);
      expect(v.levels.reduce((n, l) => n * l.length, 1), 'at most 18 paths').toBeLessThanOrEqual(18);
      break;
    case 'container':
      expect(v.fillMl).toBeGreaterThanOrEqual(0);
      expect(v.fillMl).toBeLessThanOrEqual(v.capacityMl);
      expect(v.stepMl).toBeGreaterThan(0);
      break;
    case 'scale':
      expect(v.grams).toBeGreaterThanOrEqual(0);
      expect(v.grams).toBeLessThanOrEqual(v.maxGrams);
      expect(v.stepGrams).toBeGreaterThan(0);
      break;
    default:
      break;
  }
}

function stepVisual(step: Step): Visual | undefined {
  return typeof step === 'string' ? undefined : step.visual;
}

/** All visuals of an exercise: the task, the options and the worked steps. */
function visualsOf(ex: Exercise): Visual[] {
  const out: Visual[] = [];
  if (ex.visual) out.push(ex.visual);
  if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => o.visual && out.push(o.visual));
  ex.steps.forEach((s) => {
    const v = stepVisual(s);
    if (v) out.push(v);
  });
  return out;
}

/** The strategy hints, bug hints and whyWrong texts of an exercise. */
function allHints(ex: Exercise): string[] {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong];
}

/** The answers a hint must not state: numbers ≥ 10 (docs/research.md §6.1; for a multi answer, its field values). */
function revealableAnswers(answer: Answer): number[] {
  switch (answer.kind) {
    case 'number':
      return answer.value === null ? [] : [answer.value];
    case 'numberline':
      return [answer.value];
    case 'written':
      return [answer.result];
    case 'multi':
      return answer.fields.map((f) => f.value);
    case 'choice': {
      const label = answer.options[answer.correct].label.trim();
      return /^\d+$/.test(label) ? [Number(label)] : [];
    }
    default:
      return [];
  }
}

/**
 * Hints never give the result away: a hint must not mention an answer ≥ 10 as a whole number, unless the task itself shows
 * this number (8 + □ = 15 can say 15; the answer is another number then). safeHints() in src/topics/shared.ts filters this way.
 */
export function revealedAnswers(ex: Exercise): string[] {
  const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
  const out: string[] = [];
  for (const value of revealableAnswers(ex.answer)) {
    if (Math.abs(value) < 10) continue;
    // a comma answer can also be written with two decimals ('3,4' and '3,40')
    for (const shown of Number.isInteger(value) ? [fmt(value)] : [fmt(value), fmt(value, 2)]) {
      if (mentions(task, shown)) continue;
      for (const h of allHints(ex)) if (mentions(h, shown)) out.push(`hint reveals answer ${shown}: "${h}"`);
    }
  }
  return out;
}

/** §6: numbers and results stay ≤ 1000, unit conversions in Größen may pass it. G6: a Rest task has its Probe line. */
function assertNumberRange(skill: SkillDef, ex: Exercise): void {
  const limit = skill.topicId === 'groessen' ? MAX_CONVERTED_NUMBER : MAX_NUMBER;
  const a = ex.answer;
  const values = a.kind === 'number' && a.value !== null ? [a.value] : a.kind === 'multi' ? a.fields.map((f) => f.value) : [];
  values.forEach((v) => expect(v, `${ex.key}: answer above ${limit}`).toBeLessThanOrEqual(limit));
  for (const m of (ex.expression ?? '').matchAll(/\d+/g)) expect(Number(m[0]), `${ex.key}: ${m[0]} in the expression`).toBeLessThanOrEqual(limit);
  if (a.kind === 'multi' && a.fields.some((f) => f.before?.trim() === 'Rest')) {
    expect(ex.steps.some((step) => /\d+ · \d+ \+ \d+ = \d+/.test(typeof step === 'string' ? step : step.text)), `${ex.key}: Rest needs a Probe line, 3 · 5 + 2 = 17`).toBe(true);
  }
}

export function assertWellFormedExercise(skill: SkillDef, stufe: Stufe, ex: Exercise): void {
  expect(ex.skillId).toBe(skill.id);
  expect(ex.topicId).toBe(skill.topicId);
  expect(ex.stufe).toBe(stufe);
  expect([1, 2, 3]).toContain(ex.ab);
  expect(ex.key.length).toBeGreaterThan(0);
  expect(ex.key.startsWith(skill.id), `key must start with skill id: ${ex.key}`).toBe(true);
  expect(ex.prompt.trim().length).toBeGreaterThan(0);
  expect(ex.hints.length).toBeGreaterThanOrEqual(1);
  expect(ex.steps.length).toBeGreaterThanOrEqual(1);
  expect(ex.praise.trim().length).toBeGreaterThan(0);
  expect(ex.srText.trim().length).toBeGreaterThan(0);
  expect(ex.kmk.length).toBeGreaterThanOrEqual(1);
  ex.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));

  // Bug ids are internal (never shown to children), so they are exempt from the wording checks.
  const strings = allStrings({ ...ex, bugs: ex.bugs?.map(({ id: _id, ...shown }) => shown) });
  for (const s of strings) {
    expect(/\bundefined\b|\bNaN\b|\[object|\bInfinity\b/.test(s), `suspicious text: "${s}"`).toBe(false);
    const lower = s.toLowerCase();
    for (const banned of BANNED_PHRASES) {
      const re = new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`);
      expect(re.test(lower), `banned phrase "${banned}" in "${s}"`).toBe(false);
    }
    expect(s.includes('×') || s.includes('÷'), `use · and : instead of × ÷ in "${s}"`).toBe(false);
  }
  allNumbers(ex).forEach((n) => expect(Number.isFinite(n), 'non-finite number in exercise').toBe(true));

  // Text rules (docs/research.md §4). Bug ids are not text; visuals hold labels, not sentences.
  const childTexts = [
    ...[ex.context, ex.prompt, ex.praise].filter((t): t is string => !!t),
    ...allHints(ex),
    ...ex.steps.map((step) => (typeof step === 'string' ? step : step.text)),
  ];
  const level = Math.max(stufe, ex.ab) as 1 | 2 | 3;
  const task = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const answerTexts = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label ?? '') : ex.answer.kind === 'order' ? ex.answer.items : ex.answer.kind === 'multi' ? ex.answer.fields.flatMap((f) => [f.before ?? '', f.after ?? '']) : ex.answer.kind === 'number' ? [ex.answer.before ?? '', ex.answer.after ?? ''] : [];
  const problems = [
    ...taskTextProblems(ex, stufe),
    ...questionProblems(ex),
    ...allHints(ex).flatMap(hintProblems),
    ...praiseAndStepProblems(ex, stufe),
    ...clauseProblems([...childTexts, task], stufe),
    ...passiveProblems(childTexts),
    ...longWordProblems(childTexts),
    ...pronounProblems([...childTexts, task]),
    ...numberFormatProblems([...childTexts, ex.expression ?? '', ...answerTexts], level),
    ...fachwortProblems(childTexts),
    ...methodWordProblems(childTexts),
    ...restProblems([...childTexts, ex.expression ?? '']),
    ...(NUMBER_WORD_SKILLS.has(skill.id) ? [] : numberWordProblems([...childTexts, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label ?? '') : [])])),
    ...revealedAnswers(ex),
  ];
  expect(problems.length, `text rules in ${ex.key}:\n${problems.join('\n')}`).toBe(0);

  assertWellFormedAnswer(ex.answer);
  assertAnswerLimits(ex.answer, stufe);
  assertNumberRange(skill, ex);
  visualsOf(ex).forEach((v) => assertWellFormedVisual(v, level));
  if (ex.factKey !== undefined) expect(isFactKey(ex.factKey), `factKey ${ex.factKey} is not a tracked fact (use factKeyOf)`).toBe(true);

  // The correct response is accepted.
  const ok = checkAnswer(ex.answer, correctResponse(ex.answer), ex.bugs);
  expect(ok.correct, `correct response rejected for ${ex.key}: ${JSON.stringify(ok)}`).toBe(true);

  // Bugs never coincide with the correct answer and always produce their hint.
  for (const bug of ex.bugs ?? []) {
    const r = responseForBug(ex.answer, bug);
    if (!r) continue;
    const res = checkAnswer(ex.answer, r, ex.bugs);
    expect(res.correct, `bug ${bug.id} equals the correct answer in ${ex.key}`).toBe(false);
    expect(res.invalid, `bug ${bug.id} response is not parseable in ${ex.key}`).toBeUndefined();
    expect(res.bugHint, `bug ${bug.id} hint not returned`).toBeTruthy();
  }
}

export interface SkillSuiteOptions {
  /** Samples per Stufe and context (default 150). */
  samples?: number;
  /** Minimum number of distinct exercise keys per Stufe across samples (default 30). */
  minDistinct?: number | Partial<Record<Stufe, number>>;
  /** Stufen to test (default all). */
  stufen?: Stufe[];
}

/** Registers a vitest suite that checks every invariant above for one skill. */
export function describeSkill(skill: SkillDef, opts: SkillSuiteOptions = {}): void {
  const samples = opts.samples ?? 150;
  describe(`skill ${skill.id}`, () => {
    it('has complete metadata', () => {
      expect(skill.id.startsWith(skill.topicId + '.')).toBe(true);
      expect(skill.title.trim()).not.toBe('');
      expect(skill.description.trim()).not.toBe('');
      STUFEN.forEach((s) => expect(skill.stufen[s].trim()).not.toBe(''));
      expect(longWordProblems([skill.title, skill.description, ...STUFEN.map((s) => skill.stufen[s])])).toEqual([]);
      // Title and description come word for word from the catalogue (docs/research.md §6); the Stufen lines are ours.
      const stufenLines = STUFEN.map((s) => skill.stufen[s]);
      expect([...clauseProblems(stufenLines), ...pronounProblems(stufenLines), ...(NUMBER_WORD_SKILLS.has(skill.id) ? [] : numberWordProblems(stufenLines))]).toEqual([]);
      skill.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));
    });
    it('returns the planned AB level (GenContext.ab), and keeps every rule at each Stufe', () => {
      const AB_SAMPLES = Math.min(samples, 40);
      for (const stufe of opts.stufen ?? STUFEN) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= AB_SAMPLES; seed++) {
            const ex = skill.generate(createRng(seed * 6271 + stufe * 31 + ab), stufe, { ...CONTEXTS[1], ab });
            expect(ex.ab, `${skill.id} Stufe ${stufe}, planned AB ${ab}`).toBe(ab);
            assertWellFormedExercise(skill, stufe, ex);
          }
        }
      }
    });
    const ownedFacts = ALL_FACT_KEYS.filter((k) => factSkillId(k) === skill.id);
    if (ownedFacts.length > 0) {
      it('returns the fact a review slot asks for (GenContext.factKey)', () => {
        for (const factKey of ownedFacts) {
          const ex = skill.generate(createRng(factKey.length * 17), 1, { ...CONTEXTS[1], factKey });
          expect(ex.factKey, factKey).toBe(factKey);
          assertWellFormedExercise(skill, 1, ex);
        }
      });
    }
    for (const stufe of opts.stufen ?? STUFEN) {
      it(`Stufe ${stufe}: ${samples} samples are well-formed, deterministic and varied`, () => {
        for (const ctx of CONTEXTS) {
          const keys = new Set<string>();
          for (let seed = 1; seed <= samples; seed++) {
            const ex = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
            assertWellFormedExercise(skill, stufe, ex);
            keys.add(ex.key);
            if (seed <= 5) {
              const again = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
              expect(JSON.stringify(again)).toBe(JSON.stringify(ex));
            }
          }
          const min = typeof opts.minDistinct === 'number' ? opts.minDistinct : (opts.minDistinct?.[stufe] ?? 30);
          expect(keys.size, `only ${keys.size} distinct exercises at Stufe ${stufe}`).toBeGreaterThanOrEqual(Math.min(min, samples));
        }
      });
    }
  });
}
