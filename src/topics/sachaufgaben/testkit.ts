/**
 * Test support of this topic (imported only by *.test.ts): what a child reads, as numbers and as text.
 */
import type { Exercise } from '../../core/types';

/** Every text of an exercise that a child can read: the task, the answer texts, hints, feedback and the worked steps. */
export function shownTexts(ex: Exercise): string[] {
  const a = ex.answer;
  const answer = a.kind === 'choice' ? a.options.flatMap((o) => [o.label ?? '', o.whyWrong ?? '']) : a.kind === 'multi' ? a.fields.flatMap((f) => [f.before ?? '', f.after ?? '']) : a.kind === 'number' ? [a.before ?? '', a.after ?? ''] : [];
  return [ex.context ?? '', ex.prompt, ex.expression ?? '', ...answer, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
}

/** The words of a change story: nothing comes or goes in a story of a whole and its parts, so its help must not ask about it. */
export const CHANGE_WORDS = /dazu|\bweg\b|geht|kommt|mehr oder weniger|Film/i;

/** The largest number in a text; 0 without one. */
export function largestNumber(text: string): number {
  return Math.max(0, ...[...text.matchAll(/\d+/g)].map((m) => Number(m[0])));
}

/** A price in whole Euro stated for a thing in the text ('Heft für 3,10 €', 'Jedes Heft kostet 3 €', 'Ein Buch kostet 9 €'). */
export function priceOf(thing: string, text: string): number | null {
  const m = new RegExp(`${thing}(?: kostet| für) (\\d+)(?:,(\\d+))?[\\s\\u00A0]*€`).exec(text);
  return m ? Number(m[1]) + Number(m[2] ?? 0) / 100 : null;
}
