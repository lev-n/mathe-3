/**
 * Age rules for 8–9-year-olds that generators, planners and tests share (docs/research.md §4, §7.1, §7.3).
 * All numbers are heuristics, chosen to be checkable by a unit test. Pure and free of React and of the state code.
 */
import type { Ab, Rng, Stufe, TopicId } from './types';

/** Items of a practice round (§7.3). The 3-item Einstiegs-Check counts inside the round. */
export const ROUND_SIZE = 10;
/** Items of a round in `schriftlich` (§7.3): a written item costs several cells plus carries. */
export const SHORT_ROUND_SIZE = 8;

/** The topic with the shorter round. */
const SHORT_ROUND_TOPICS: ReadonlySet<TopicId> = new Set<TopicId>(['schriftlich']);

export function roundSize(topicId: TopicId): number {
  return SHORT_ROUND_TOPICS.has(topicId) ? SHORT_ROUND_SIZE : ROUND_SIZE;
}

/** AB I/II/III items per round of a Stufe (§7.3): every Stufe keeps some harder items. */
export const AB_MIX: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [6, 3, 1],
  2: [4, 4, 2],
  3: [2, 5, 3],
};
/** The same for the 8-item round. */
export const AB_MIX_SHORT: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [5, 2, 1],
  2: [3, 3, 2],
  3: [2, 4, 2],
};

/** The AB levels of the items of one round of `size` items (10 or 8), easier items first. */
export function abSequence(stufe: Stufe, size: number = ROUND_SIZE): Ab[] {
  const mix = size === SHORT_ROUND_SIZE ? AB_MIX_SHORT : AB_MIX;
  return mix[stufe].flatMap((n, i) => Array.from({ length: n }, () => (i + 1) as Ab));
}

/** An AB level drawn with the weights of AB_MIX (items outside a planned round, such as worksheets). */
export function drawAb(rng: Rng, stufe: Stufe): Ab {
  return rng.pick(abSequence(stufe));
}

/** Answer limits (§7.1). */
export const MAX_CHOICE_OPTIONS: Readonly<Record<Stufe, number>> = { 1: 4, 2: 6, 3: 6 };
export const MAX_ORDER_ITEMS = 6;
export const MAX_MULTI_FIELDS = 4;

/** Largest number and result a task works with (§2.2): 1000 is the top value. */
export const MAX_NUMBER = 1000;
/** Unit conversions in Größen may pass it (2500 m, 9 km = 9000 m). */
export const MAX_CONVERTED_NUMBER = 10000;

/** Text limits (§4, T1–T4, T16). */
export const TEXT_LIMITS = {
  /** T1: words of a task without a story. */
  taskWords: 15,
  /** T2: words of a story task (an exercise with `context`). */
  storyWords: { 1: 25, 2: 32, 3: 40 } as Readonly<Record<Stufe, number>>,
  /** T3: sentences, including the question. */
  sentences: 4,
  /** T4: words per sentence. */
  sentenceWords: { 1: 12, 2: 12, 3: 14 } as Readonly<Record<Stufe, number>>,
  /** T7: numbers per sentence of a task; a mixed quantity ('3 € 40 ct') counts as one. */
  sentenceNumbers: 2,
  /** T16: a hint. */
  hintWords: 14,
  hintSentences: 2,
  /** T16: praise. */
  praiseWords: 10,
  /** T16: "one line each" for a worked step, counted in words (the proxy a test can check). */
  stepWords: 14,
  /** T16: worked steps on Stufe 1. */
  stepsStufe1: 4,
} as const;
