/**
 * Helpers of the topic 'groessen' only. Generic ones live in src/topics/shared.ts. Pure functions.
 *
 * Every skill lists its task forms per AB level: the catalogue columns S1, S2, S3 of docs/research.md §6 are roughly AB I, II, III, so the
 * planned AB picks the column and the Stufe sets the size of the numbers (and the limits of src/core/age.ts). The AB mix brings harder forms
 * to every Stufe, except where docs/research.md limits content to a higher Stufe: seconds and the km comma (§2.2: Stufe 3), the m comma (§2.2:
 * Stufe 2), the leading zero (G7: Stufe 2), exact minutes (G17: Stufe 2). Such a form goes through fromStufe() or keeps the limit itself.
 */
import { NBSP, speak } from '../../core/format';
import type { Ab, Bug, ChoiceAnswer, MultiField, OrderAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, plural, targetAb, type ExerciseBody } from '../shared';

export type Form = (rng: Rng, stufe: Stufe, ab: Ab) => ExerciseBody;

interface GatedForm {
  from: Stufe;
  form: Form;
}

/** A form that docs/research.md keeps for this Stufe and above. Every AB level needs another form for the Stufen below. */
export function fromStufe(from: Stufe, form: Form): GatedForm {
  return { from, form };
}

/** The task forms of a skill: forms[ab] is the catalogue column of this AB level. */
export function generator(skill: Pick<SkillDef, 'id' | 'topicId'>, forms: Readonly<Record<Ab, readonly (Form | GatedForm)[]>>): SkillDef['generate'] {
  return (rng, stufe, ctx) => {
    const ab = targetAb(rng, stufe, ctx);
    const pool = forms[ab].flatMap((f) => (typeof f === 'function' ? [f] : stufe >= f.from ? [f.form] : []));
    return build(skill, stufe, rng.pick(pool)(rng, stufe, ab));
  };
}

/** srText from the visible parts of a task. */
export function sr(...parts: (string | undefined)[]): string {
  return parts.filter((p): p is string => !!p).map(speak).join(' ');
}

const UNIT_WORDS: Readonly<Record<string, string>> = { mm: 'Millimeter', cm: 'Zentimeter', m: 'Meter', km: 'Kilometer', g: 'Gramm', kg: 'Kilogramm', ml: 'Milliliter', l: 'Liter', ct: 'Cent', '€': 'Euro', s: 'Sekunden', min: 'Minuten', h: 'Stunden' };

/** srText of a choice of units: the options are only signs ('h', 'l'), so the description names them as words (T17). */
export function unitChoiceSr(answer: ChoiceAnswer): string {
  return `Wähle aus: ${answer.options.map((o) => UNIT_WORDS[o.label]).join(', ')}.`;
}

/** The labelled number at or below a value on a scale and the ticks from there: how the hints read a scale. */
export function fromLabel(value: number, labelled: number, step: number): { last: number; ticks: number } {
  const last = Math.floor(value / labelled) * labelled;
  return { last, ticks: (value - last) / step };
}

/** 'n unit' with a no-break space, as in the shared formatters. */
export function qty(n: number, unit: string): string {
  return `${n}${NBSP}${unit}`;
}

/** 'Es bleiben 5 mm', 'Es bleibt 1 mm'. */
export function restText(n: number, unit: string): string {
  return `${plural(n, 'Es bleibt', 'Es bleiben')} ${qty(n, unit)}`;
}

/** '5 ct brauchen 2 Stellen nach dem Komma: 05.', with the verb in the singular for 1. */
export function zweiStellenText(n: number, unit: string): string {
  return `${qty(n, unit)} ${plural(n, 'braucht', 'brauchen')} 2 Stellen nach dem Komma: ${String(n).padStart(2, '0')}.`;
}

// ─── Order tasks ─────────────────────────────────────────────────────────────

export interface OrderItem {
  label: string;
  /** Its value in the smallest unit. */
  value: number;
  /** What a typical misreading takes it for (order bugs). */
  misread?: number;
  /** Its number without the unit: what a child sorts by when the units are ignored. */
  printed?: number;
}

function sortedIndices(items: readonly OrderItem[], read: (item: OrderItem) => number, direction: OrderAnswer['direction']): number[] {
  const sign = direction === 'aufsteigend' ? 1 : -1;
  return items.map((_, i) => i).sort((a, b) => sign * (read(items[a]) - read(items[b])));
}

/** An order task with the items shuffled (never already in the target order). Item values must differ. */
export function orderItems(rng: Rng, items: readonly OrderItem[], direction: OrderAnswer['direction']): { answer: OrderAnswer; shown: OrderItem[] } {
  let shown = rng.shuffle(items);
  const inOrder = (list: OrderItem[]) => sortedIndices(list, (x) => x.value, direction).every((v, i) => v === i);
  if (inOrder(shown)) shown = [...shown.slice(1), shown[0]];
  return { answer: { kind: 'order', items: shown.map((x) => x.label), correct: sortedIndices(shown, (x) => x.value, direction), direction }, shown };
}

/** The order a misreading gives, as a Bug; null if it gives the right order or a tie (then no single wrong order follows from it). */
export function orderBug(id: string, answer: OrderAnswer, shown: readonly OrderItem[], read: (item: OrderItem) => number, hint: string): Bug | null {
  if (new Set(shown.map(read)).size < shown.length) return null;
  const match = sortedIndices(shown, read, answer.direction);
  return match.every((v, i) => v === answer.correct[i]) ? null : { id, match, hint };
}

/** Labels in the target order as a chain: '690 cm < 705 cm' going up, '705 cm > 690 cm' going down. */
export function orderChain(labels: readonly string[], direction: OrderAnswer['direction']): string {
  return labels.join(direction === 'aufsteigend' ? ' < ' : ' > ');
}

/** The last worked steps of an order task: the labels in the target order, on two lines if one would pass T16 (14 words). */
export function orderAnswerSteps(labels: readonly string[], direction: OrderAnswer['direction']): string[] {
  const words = labels.join(' ').split(/\s/).length;
  if (words < 14) return [`Also: ${orderChain(labels, direction)}`];
  const half = Math.ceil(labels.length / 2);
  return [`Also: ${orderChain(labels.slice(0, half), direction)}`, `Dann: ${orderChain(labels.slice(half), direction)}`];
}

/** srText of an order task: commas keep the items apart, as each can have two units ('3 Zentimeter 2 Millimeter, 4 Zentimeter'). */
export function orderSr(prompt: string, labels: readonly string[]): string {
  return sr(prompt, `${labels.join(', ')}.`);
}

/** Drops missing bugs and bugs with the same order. */
export function orderBugs(bugs: (Bug | null)[]): Bug[] {
  const out: Bug[] = [];
  for (const b of bugs) if (b && !out.some((x) => JSON.stringify(x.match) === JSON.stringify(b.match))) out.push(b);
  return out;
}

// ─── Money ───────────────────────────────────────────────────────────────────

const PIECES = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

/** A sum in Cent with the fewest notes and coins, largest first. */
export function moneyPieces(cents: number): number[] {
  const out: number[] = [];
  let rest = cents;
  for (const p of PIECES) {
    while (rest >= p) {
      out.push(p);
      rest -= p;
    }
  }
  return out;
}

/** A note or coin as it is printed: 2000 → '20 €', 50 → '50 ct'. */
export function pieceText(cents: number): string {
  return cents >= 100 ? qty(cents / 100, '€') : qty(cents, 'ct');
}

// ─── Time ────────────────────────────────────────────────────────────────────

/**
 * A clock time as two fields. The join ':' is what the shared read-aloud test (src/ui/practice/speech.test.ts) looks for; the solution
 * text still reads in school notation ('13.50 Uhr', src/core/check.ts).
 */
export function timeFields(h: number, m: number): MultiField[] {
  return [{ id: 'h', value: h, after: '.', label: 'Stunden' }, { id: 'min', value: m, after: 'Uhr', label: 'Minuten' }];
}

/** 1–12 on the clock face. */
export function faceHour(h: number): number {
  return h % 12 === 0 ? 12 : h % 12;
}

/** The hands in words, for srText. */
export function handsText(h: number, m: number): string {
  const cur = faceHour(h);
  const hour = m === 0 ? `Der kurze Zeiger zeigt auf die ${cur}.` : `Der kurze Zeiger steht nach der ${cur}.`;
  const num = Math.floor(m / 5) === 0 ? 12 : Math.floor(m / 5);
  const rest = m % 5;
  const minute = rest === 0 ? `Der lange Zeiger zeigt auf die ${num}.` : `Der lange Zeiger steht ${rest} ${rest === 1 ? 'Strich' : 'Striche'} nach der ${num}.`;
  return `${hour} ${minute}`;
}
