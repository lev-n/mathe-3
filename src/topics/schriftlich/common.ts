/**
 * Shared helpers of the 'schriftlich' generators: numbers, worked steps in the Sprechweise of the method set, hints, praise and the
 * builder of a written item. The texts follow docs/research.md §4; the two subtraction methods never share a text (T12).
 */
import { MINUS, TIMES, fmt, speak } from '../../core/format';
import type { Ab, AnswerOf, Bug, Exercise, GenContext, Rng, SkillDef, Step, Stufe, SubtractionMethod, Visual, WrittenOp } from '../../core/types';
import { correctResult, digitAt, layoutAdd, layoutMul, layoutSub, numLength, placeName, writtenVisual } from '../../core/written';
import { build, mentionsNumber } from '../shared';
import { bugsFor, missingLine } from './bugs';

export type SkillRef = Pick<SkillDef, 'id' | 'topicId'>;

/** The child's method; Abziehen by default (docs/research.md §6), also for a context that does not set it. */
export function methodOf(ctx: Partial<Pick<GenContext, 'subtractionMethod'>>): SubtractionMethod {
  return ctx.subtractionMethod ?? 'abziehen';
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** A random number with exactly `len` digits. */
export function randLen(rng: Rng, len: number): number {
  return len === 1 ? rng.int(1, 9) : rng.int(10 ** (len - 1), 10 ** len - 1);
}

/** A random number with exactly `len` digits, none of them 0. */
export function noZeros(rng: Rng, len: number): number {
  let n = 0;
  for (let i = 0; i < len; i++) n = n * 10 + rng.int(1, 9);
  return n;
}

/** Try `make` until it returns a value (deterministic for a given rng), then `fallback`. */
export function attempt<T>(make: () => T | null, fallback: T, tries = 400): T {
  for (let i = 0; i < tries; i++) {
    const v = make();
    if (v !== null) return v;
  }
  return fallback;
}

/** Number of Überträge of a plus task, the last one to the front included. */
export function carryCount(operands: readonly number[]): number {
  return layoutAdd(operands).carries.filter((c) => c > 0).length;
}

/** The regroupings of a minus task, measured with Abziehen: the task pool stays the same in both methods. */
export const subLayout = (a: number, b: number) => layoutSub(a, b, 'abziehen');

/** Round to the nearest hundred. */
export const toHundred = (n: number) => Math.round(n / 100) * 100;

// ─── Notation ────────────────────────────────────────────────────────────────

const SIGN: Record<WrittenOp, string> = { add: '+', sub: MINUS, mul: TIMES };

/** '587 + 34' */
export function termOf(op: WrittenOp, operands: readonly number[]): string {
  return operands.map((n) => fmt(n)).join(` ${SIGN[op]} `);
}

/** '587 + 34 = 621', with the given result if there is one. */
export function equationOf(op: WrittenOp, operands: readonly number[], shown: number = correctResult(op, operands)): string {
  return `${termOf(op, operands)} = ${fmt(shown)}`;
}

/** A solved or empty written visual, with the method for a minus task. places: the head row of Stufe 1 (G4). */
export function solved(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, stufe: Stufe): Visual {
  return writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: true, places: op !== 'mul' && stufe === 1 ? true : undefined });
}

// ─── Worked steps ────────────────────────────────────────────────────────────

function addSteps(operands: readonly number[]): string[] {
  const lay = layoutAdd(operands);
  const len = Math.max(...operands.map(numLength));
  return Array.from({ length: len }, (_, p) => {
    const digits = operands.filter((n) => numLength(n) > p).map((n) => digitAt(n, p));
    const carry = lay.carries[p];
    const s = lay.columnSums[p];
    const name = placeName(p);
    if (digits.length === 1 && carry === 0) return `${name}: Nur die ${s}. Schreib ${s}.`;
    const calc = `${[...digits, ...(carry ? [carry] : [])].join(' + ')} = ${s}`;
    return p === len - 1 || s < 10 ? `${name}: ${calc}. Schreib ${s}.` : `${name}: ${calc}. Schreib ${s % 10}, Übertrag ${Math.floor(s / 10)}.`;
  });
}

function abziehenSteps(a: number, b: number): string[] {
  const lay = layoutSub(a, b, 'abziehen');
  const resultLen = numLength(a - b);
  return lay.columns.map((c) => {
    const name = placeName(c.place);
    const low = c.b ?? 0;
    if (c.place >= resultLen && c.r === 0) {
      // no digit below: the 1 on top was changed away. Otherwise top and bottom are equal, whatever digit that is.
      if (c.b === null) return `${name}: Oben ist jetzt 0. ${NO_ZERO}`;
      return `${name}: ${c.before !== c.a ? `Oben ist jetzt ${c.before}. ` : ''}${c.before} ${MINUS} ${low} = 0. ${NO_ZERO}`;
    }
    if (c.regrouped) {
      const from = c.regroupFrom ?? c.place + 1;
      if (from > c.place + 1) {
        const zeros = from - c.place - 1;
        return `${name}: ${c.before} ${MINUS} ${low} geht nicht. Wechsle 1 ${placeName(from)} über die ${zeros === 1 ? '0' : 'Nullen'}. ${c.top} ${MINUS} ${low} = ${c.r}.`;
      }
      const start = c.before === c.a ? `${c.before} ${MINUS} ${low} geht nicht.` : `Oben ist jetzt ${c.before}.`;
      return `${name}: ${start} Wechsle 1 ${placeName(from)}: ${c.top} ${MINUS} ${low} = ${c.r}.`;
    }
    const changed = c.before !== c.a;
    if (c.b === null) return changed ? `${name}: Oben ist jetzt ${c.before}. Schreib ${c.r}.` : `${name}: Unten steht nichts. Schreib ${c.r}.`;
    return changed ? `${name}: Oben ist jetzt ${c.before}. ${c.before} ${MINUS} ${low} = ${c.r}.` : `${name}: ${c.before} ${MINUS} ${low} = ${c.r}.`;
  });
}

function ergaenzenSteps(a: number, b: number): string[] {
  const lay = layoutSub(a, b, 'ergaenzen');
  const resultLen = numLength(a - b);
  return lay.columns.map((c) => {
    const name = placeName(c.place);
    if (c.b === null && c.carryIn === 0) return `${name}: Unten steht nichts. Schreib ${c.r}.`;
    const lower = (c.b ?? 0) + c.carryIn;
    const target = c.extended ? c.a + 10 : c.a;
    const missing = missingLine(lower, target);
    const start = c.carryIn === 0 ? '' : c.b === null ? 'Nur der Übertrag 1. ' : `${c.b} + 1 = ${lower}. `;
    if (c.place >= resultLen && c.r === 0) return `${name}: ${start}${missing} ${NO_ZERO}`;
    return `${name}: ${start}${missing} Schreib ${c.r}${c.extended ? ', Übertrag 1' : ''}.`;
  });
}

function mulSteps(a: number, m: number): string[] {
  const lay = layoutMul(a, m);
  const la = numLength(a);
  return Array.from({ length: la }, (_, p) => {
    const d = digitAt(a, p);
    const carry = lay.carries[p];
    const v = d * m + carry;
    const calc = `${m} ${TIMES} ${d}${carry ? ` + ${carry}` : ''} = ${v}`;
    return p === la - 1 || v < 10 ? `${placeName(p)}: ${calc}. Schreib ${v}.` : `${placeName(p)}: ${calc}. Schreib ${v % 10}, Übertrag ${Math.floor(v / 10)}.`;
  });
}

/** The line of a column whose 0 is left out in front. */
const NO_ZERO = 'Keine 0 vorne.';

/** One line per place, index = place. */
export function columnSteps(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string[] {
  if (op === 'add') return addSteps(operands);
  if (op === 'mul') return mulSteps(operands[0], operands[1]);
  return method === 'abziehen' ? abziehenSteps(operands[0], operands[1]) : ergaenzenSteps(operands[0], operands[1]);
}

/** The line for a whole calculation on a Stufe without room for every column (T16). */
export const ALL_COLUMNS = 'Rechne Spalte für Spalte, von den Einern nach links.';

/** T16: at most 4 worked steps on Stufe 1. A task with its own first steps keeps those and sums up the columns. */
export function workedSteps(stufe: Stufe, op: WrittenOp, operands: readonly number[], method: SubtractionMethod, before: Step[] = []): Step[] {
  const columns = columnSteps(op, operands, method);
  const last: Step = { text: `Ergebnis: ${equationOf(op, operands)}.`, visual: solved(op, operands, method, stufe) };
  if (stufe !== 1 || before.length + columns.length + 1 <= 4) return [...before, ...columns, last];
  const needed = columns.filter((text) => !text.endsWith(NO_ZERO));
  if (before.length + needed.length + 1 <= 4) return [...before, ...needed, last];
  return [...before, ALL_COLUMNS, last];
}

// ─── Hints and praise ────────────────────────────────────────────────────────

/** Strategy hints with the child's numbers. They name the next step and keep the result back. */
export function writtenHints(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string[] {
  const ones = operands.map((n) => digitAt(n, 0));
  if (op === 'add') return ['Fang bei den Einern an. Das ist rechts.', `Bei den Einern: ${ones.join(' + ')}. Sind das 10 oder mehr?`];
  if (op === 'mul') return ['Fang bei den Einern an. Nimm jede Ziffer mal.', `Bei den Einern: ${operands[1]} ${TIMES} ${ones[0]}. Was schreibst du hin?`];
  return method === 'abziehen'
    ? ['Fang bei den Einern an: oben minus unten.', `Bei den Einern: ${ones[0]} ${MINUS} ${ones[1]}. Geht das?`]
    : ['Fang bei den Einern an: Ergänze von unten bis oben.', `Bei den Einern: Von ${ones[1]} bis ${ones[0]}. Geht das?`];
}

/** Specific praise: names what this calculation asked for. */
export function writtenPraise(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string {
  if (op === 'add') {
    if (carryCount(operands) > 1) return 'Du hast jeden Übertrag mitgerechnet.';
    if (carryCount(operands) === 1) return 'Du hast den Übertrag mitgerechnet.';
    if (new Set(operands.map(numLength)).size > 1) return 'Du hast Einer unter Einer gerechnet.';
    return 'Du hast Spalte für Spalte gerechnet.';
  }
  if (op === 'mul') {
    return layoutMul(operands[0], operands[1]).carryCount > 0 ? 'Du hast den Übertrag nach dem Malnehmen dazugerechnet.' : 'Du hast jede Ziffer malgenommen.';
  }
  const lay = subLayout(operands[0], operands[1]);
  if (method === 'abziehen') {
    if (lay.acrossZero) return 'Du hast über die Null gewechselt.';
    if (lay.regroupings > 0) return 'Du hast gewechselt und oben 1 weniger gerechnet.';
  } else {
    if (layoutSub(operands[0], operands[1], 'ergaenzen').regroupings > 0) return 'Du hast erweitert und den Übertrag mitgerechnet.';
  }
  return 'Du hast Spalte für Spalte gerechnet.';
}

/** Spoken task: 'Rechne schriftlich: 587 plus 34.' */
export function writtenSpeech(op: WrittenOp, operands: readonly number[], lead = 'Rechne schriftlich'): string {
  return `${lead}: ${speak(termOf(op, operands))}.`;
}

// ─── Hint safety ─────────────────────────────────────────────────────────────

/** Texts that state the answer are left out, unless the task itself shows that number (docs/research.md §6.1). */
export function withoutAnswer<T>(items: readonly T[], textOf: (item: T) => string, answer: number, task: string): T[] {
  if (answer < 10 || mentionsNumber(task, fmt(answer))) return [...items];
  return items.filter((item) => !mentionsNumber(textOf(item), fmt(answer)));
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export interface WrittenSpec {
  ab: Ab;
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  kmk: string[];
  /** Extra key part for a task form with the same numbers. */
  form?: string;
  prompt?: string;
  expression?: string;
  visual?: Visual;
  ueberschlag?: number;
  /** Steps before the columns. */
  before?: Step[];
  /** Strategy hints in front of the usual ones. */
  hints?: string[];
  /** Bugs in front of the usual ones. */
  bugs?: Bug[];
  praise?: string;
  srLead?: string;
  knobel?: boolean;
}

/** A complete exercise with answer kind 'written'. */
export function writtenItem(skill: SkillRef, stufe: Stufe, spec: WrittenSpec): Exercise {
  const { op, operands, method } = spec;
  const result = correctResult(op, operands);
  const answer: AnswerOf<'written'> = { kind: 'written', op, operands: [...operands], result };
  if (op === 'sub') answer.method = method;
  if (spec.ueberschlag !== undefined) answer.ueberschlag = spec.ueberschlag;
  const prompt = spec.prompt ?? 'Rechne schriftlich. Fang bei den Einern an.';
  const task = [prompt, spec.expression ?? ''].join(' ');
  const hints = withoutAnswer([...(spec.hints ?? []), ...writtenHints(op, operands, method)], (h) => h, result, task);
  const seen = new Set<number>();
  const bugs = withoutAnswer([...(spec.bugs ?? []), ...bugsFor(op, operands, method)], (b) => b.hint, result, task).filter((b) => {
    const match = b.match as number;
    if (seen.has(match) || match === result) return false;
    seen.add(match);
    return true;
  });
  return build(skill, stufe, {
    key: `${spec.form ?? 'rechnen'}:${op}:${operands.join('|')}${op === 'sub' ? `:${method[0]}` : ''}`,
    ab: spec.ab,
    prompt,
    ...(spec.expression ? { expression: spec.expression } : {}),
    ...(spec.visual ? { visual: spec.visual } : {}),
    answer,
    hints: hints.length ? hints : [ALL_COLUMNS],
    steps: workedSteps(stufe, op, operands, method, spec.before),
    bugs,
    praise: spec.praise ?? writtenPraise(op, operands, method),
    srText: writtenSpeech(op, operands, spec.srLead),
    kmk: spec.kmk,
    ...(spec.knobel ? { knobel: true } : {}),
  });
}
