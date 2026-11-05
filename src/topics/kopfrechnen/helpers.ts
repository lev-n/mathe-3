/**
 * Helpers of the topic 'kopfrechnen': the task body of a generator, the terms as they are written, and the visuals these skills share.
 * Pure functions only (no React, randomness only through the Rng parameter).
 */
import { DIV, MINUS, TIMES, speak } from '../../core/format';
import type { Ab, Exercise, MultiField, PlaceColumn, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { build, type ExerciseBody } from '../shared';

/** What a task form returns: the skill's generator adds the AB level and, unless the form brings its own, the KMK tags. */
export type Task = Omit<ExerciseBody, 'ab' | 'kmk'> & { kmk?: string[] };

export function finish(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, ab: Ab, kmk: string[], task: Task): Exercise {
  return build(skill, stufe, { kmk, ...task, ab });
}

export const mal = (a: number, b: number): string => `${a} ${TIMES} ${b}`;
export const durch = (a: number, b: number): string => `${a} ${DIV} ${b}`;

export type Op = '+' | typeof MINUS;
export const PLUS_OP: Op = '+';
export const MINUS_OP: Op = MINUS;

export const calc = (a: number, op: Op, b: number): number => (op === '+' ? a + b : a - b);
export const term = (a: number, op: Op, b: number): string => `${a} ${op} ${b}`;
/** The other Rechenzeichen. */
export const flip = (op: Op): Op => (op === '+' ? MINUS_OP : PLUS_OP);

/** Spoken task (T17): the parts in reading order, the signs as words. */
export function spoken(...parts: (string | undefined)[]): string {
  return speak(parts.filter(Boolean).map((p) => (/[.!?]$/.test(p as string) ? p : `${p}.`)).join(' '));
}

/** The answer fields as they are read: the text around each field, with 'Lücke' for the field. */
export function spokenFields(fields: readonly MultiField[]): string {
  return fields.map((f) => [f.before, '□', f.after].filter(Boolean).join(' ')).join('. ');
}

/** Punktefeld with a gap after 5 rows and columns (Kraft der Fünf). */
export function punktefeld(rows: number, cols: number): Visual {
  const v: Visual = { type: 'dotArray', rows, cols };
  if (rows > 5) v.splitAfterRow = 5;
  if (cols > 5) v.splitAfterCol = 5;
  return v;
}

/** `count` equal groups of `size` dots, then a smaller group for a Rest. */
export function gruppen(count: number, size: number, rest = 0): Visual {
  return { type: 'dotArray', groups: [...Array.from({ length: count }, () => size), ...(rest > 0 ? [rest] : [])] };
}

/** `n` dots as a picture without the answer in it: frames of 10. */
export function loseGruppen(n: number): Visual {
  const tens = Math.floor(n / 10);
  return { type: 'dotArray', groups: [...Array.from({ length: tens }, () => 10), ...(n % 10 > 0 ? [n % 10] : [])] };
}

/** Empty Rechenstrich: only the numbers of the way are labelled, each jump is an arc. */
export function rechenstrich(points: readonly number[]): Visual {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const jumps = points.slice(1).map((to, i) => {
    const from = points[i];
    return { from, to, label: `${to > from ? '+' : MINUS} ${Math.abs(to - from)}` };
  });
  return { type: 'numberLine', min, max, majorStep: max - min, minorStep: max - min, labelMajor: false, labels: [...points], jumps };
}

/** The width of a drawn Rechenstrich between its outer points, in the units of src/ui/visuals/NumberLineVisual.tsx. */
const STRICH_WIDTH = 340;
/** Neighbouring points closer than this leave no room for their numbers, even on two rows. */
const STRICH_MIN_GAP = 22;
/** About the width of the label of a jump: '+ 10'. */
const jumpWidth = (size: number) => (String(size).length + 2) * 9.5;

/** Numbers and jump labels of this way all stay readable on one Rechenstrich, which is drawn to scale. */
function strichFits(points: readonly number[]): boolean {
  const scale = STRICH_WIDTH / Math.abs(points[points.length - 1] - points[0]);
  const sizes = points.slice(1).map((to, i) => Math.abs(to - points[i]));
  return sizes.every((s, i) => s * scale >= STRICH_MIN_GAP && (i === 0 || ((s + sizes[i - 1]) * scale) / 2 >= (jumpWidth(s) + jumpWidth(sizes[i - 1])) / 2 + 4));
}

/**
 * The lines of a way, one per jump, with its Rechenstrich. A way with small and big jumps (281, 290, 300, 1000) does not fit one line
 * drawn to scale, so it gets one picture per stretch that fits: 281, 290, 300 and then 300, 1000. A picture comes with the last jump it shows.
 */
export function strichSteps(points: readonly number[], lines: readonly string[]): Step[] {
  const steps: Step[] = [...lines];
  let start = 0;
  while (start < points.length - 1) {
    let end = points.length - 1;
    while (end > start + 1 && !strichFits(points.slice(start, end + 1))) end--;
    steps[end - 1] = { text: lines[end - 1], visual: rechenstrich(points.slice(start, end + 1)) };
    start = end;
  }
  return steps;
}

/** Number line in steps of 10 over the hundreds around the given numbers, with a mark at `mark`. */
export function zehnerStrahl(mark: number, ...others: number[]): Visual {
  const all = [mark, ...others];
  const min = Math.floor(Math.min(...all) / 100) * 100;
  const top = Math.max(...all);
  const max = Math.max(Math.ceil(top / 100) * 100, min + 100);
  return { type: 'numberLine', min, max, majorStep: 50, minorStep: 10, labelMajor: true, marks: [{ value: mark, label: String(mark) }] };
}

/** Stellenwerttafel with one row per number. */
export function stellenTafel(numbers: readonly number[]): Visual {
  const columns: PlaceColumn[] = Math.max(...numbers) >= 1000 ? ['T', 'H', 'Z', 'E'] : ['H', 'Z', 'E'];
  const rows = numbers.map((n) => {
    const digits = String(n).padStart(columns.length, ' ').split('');
    return { values: digits.map((d) => (d === ' ' ? null : Number(d))) };
  });
  return { type: 'placeValue', columns, rows };
}
