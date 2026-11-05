/**
 * The facts of the Einmaleins for the two trainers kopfrechnen.einmaleins and kopfrechnen.umkehren: which facts a Stufe holds, the order
 * in which new facts come, never row by row, and the choice of the next fact from the Leitner boxes. Keys: src/state/facts.ts.
 */
import { DIV_FACT_KEYS, MUL_FACT_KEYS, factFactors, isDivisionFact, isFactKey } from '../../state/facts';
import type { GenContext, Rng, Stufe } from '../../core/types';
import { mal } from './helpers';

const KERN: readonly number[] = [1, 2, 5, 10];
const isKern = (n: number) => KERN.includes(n);

export type FactKind = 'kern' | 'quadrat' | 'schwer';

export function factKind(a: number, b: number): FactKind {
  if (isKern(a) || isKern(b)) return 'kern';
  return a === b ? 'quadrat' : 'schwer';
}

/** New facts run through the other factor in this order, so that no Einmaleinsreihe comes as a row. */
const OTHER_ORDER: readonly number[] = [3, 7, 4, 9, 6, 8, 2, 5, 10, 1];
/** The Kernzahl beside a factor that is no Kernzahl. */
export const NEAREST: Readonly<Record<number, number>> = { 3: 2, 4: 5, 6: 5, 7: 5, 8: 10, 9: 10 };

/** Mal 2 and mal 10 first, then mal 5, then mal 1. */
function kernTier(a: number, b: number): number {
  if ([a, b].some((f) => f === 2 || f === 10)) return 0;
  return [a, b].includes(5) ? 1 : 2;
}

const kindRank = (a: number, b: number) => ['kern', 'quadrat', 'schwer'].indexOf(factKind(a, b));
/** The factor beside the Kernzahl, the Reihe a new fact belongs to. */
function otherFactor(a: number, b: number): number {
  const k = [2, 10, 5, 1].find((f) => a === f || b === f);
  return k === undefined ? Math.min(a, b) : a === k ? b : a;
}
const distance = (a: number, b: number) => Math.min(Math.abs(a - (NEAREST[a] ?? a)), Math.abs(b - (NEAREST[b] ?? b)));

/** All 100 Malaufgaben in the order they come: Kernaufgaben, Quadrataufgaben, the others (closest to a Kernaufgabe first). */
export const MUL_INTRO_ORDER: readonly string[] = [...MUL_FACT_KEYS].sort((x, y) => {
  const [a1, b1] = factFactors(x);
  const [a2, b2] = factFactors(y);
  const rank = kindRank(a1, b1);
  return (
    rank - kindRank(a2, b2) ||
    (rank === 0 ? kernTier(a1, b1) - kernTier(a2, b2) : rank === 2 ? distance(a1, b1) - distance(a2, b2) : 0) ||
    OTHER_ORDER.indexOf(otherFactor(a1, b1)) - OTHER_ORDER.indexOf(otherFactor(a2, b2)) ||
    a1 * b1 - a2 * b2 ||
    a1 - a2
  );
});

const divQuotient = (key: string) => factFactors(key)[0] / factFactors(key)[1];
const divTier = (d: number, q: number) => (d === 2 || d === 10 ? 0 : d === 5 ? 1 : d === 1 ? 2 : isKern(q) ? 3 : 4);

/** All 90 Geteiltaufgaben in the order they come: divisors 2 and 10, 5, 1, then the others. */
export const DIV_INTRO_ORDER: readonly string[] = [...DIV_FACT_KEYS].sort((x, y) => {
  const [, d1] = factFactors(x);
  const [, d2] = factFactors(y);
  const q1 = divQuotient(x);
  const q2 = divQuotient(y);
  return divTier(d1, q1) - divTier(d2, q2) || OTHER_ORDER.indexOf(q1) - OTHER_ORDER.indexOf(q2) || d1 - d2;
});

/** §6: Stufe 1 holds Kern- and Quadrataufgaben, Stufe 2 all 100, Stufe 3 the hard facts. */
export function mulPool(stufe: Stufe): readonly string[] {
  if (stufe === 2) return MUL_INTRO_ORDER;
  return MUL_INTRO_ORDER.filter((k) => {
    const [a, b] = factFactors(k);
    return (factKind(a, b) === 'schwer') === (stufe === 3);
  });
}

/** §6: Stufe 1 holds the divisors 1, 2, 5, 10, Stufe 2 all 90, Stufe 3 the hard facts. */
export function divPool(stufe: Stufe): readonly string[] {
  if (stufe === 2) return DIV_INTRO_ORDER;
  return DIV_INTRO_ORDER.filter((k) => {
    const d = factFactors(k)[1];
    return stufe === 1 ? isKern(d) : !isKern(d) && !isKern(divQuotient(k));
  });
}

/** Facts in box 0 (new or missed) that may be open at once before new facts wait. */
const MAX_LEARNING = 4;

/**
 * The next fact of a pool, which keeps the intro order.
 * Without fact data (worksheets, no consent) every fact is equally likely.
 * With fact data, due facts come first, most overdue first. Otherwise come the next new facts, mixed with box 0 and now and then a known
 * fact; new facts wait while MAX_LEARNING facts are open.
 */
export function pickFact(rng: Rng, ctx: Pick<GenContext, 'facts' | 'today'>, pool: readonly string[]): string {
  const facts = ctx.facts;
  if (!facts) return rng.pick(pool);
  const today = ctx.today;
  const started = pool.filter((k) => k in facts);
  const due = started
    .filter((k) => {
      const d = facts[k].due;
      return !d || (today !== undefined && d <= today);
    })
    .sort((x, y) => (facts[x].due ?? '').localeCompare(facts[y].due ?? '') || facts[x].box - facts[y].box);
  if (due.length > 0) return rng.pick(due.slice(0, 4));
  const learning = started.filter((k) => facts[k].box === 0);
  const known = started.filter((k) => facts[k].box >= 1);
  const fresh = learning.length < MAX_LEARNING ? pool.filter((k) => !(k in facts)).slice(0, 3) : [];
  const roll = rng.next();
  if (fresh.length > 0) {
    if (learning.length > 0 && roll < 0.4) return rng.pick(learning);
    if (known.length > 0 && roll >= 0.9) return rng.pick(known);
    return rng.pick(fresh);
  }
  if (learning.length > 0 && (known.length === 0 || roll < 0.7)) return rng.pick(learning);
  return known.length > 0 ? rng.pick(known) : rng.pick(pool);
}

/** true if the fact is new or fell back to box 0: it gets a picture. Unknown without fact data. */
export function isNewFact(key: string, ctx: Pick<GenContext, 'facts'>): boolean | null {
  if (!ctx.facts) return null;
  const f = ctx.facts[key];
  return !f || f.box === 0;
}

/** The fact a review slot asks for, when it is a fact of this kind. */
export function askedFact(ctx: Pick<GenContext, 'factKey'>, division: boolean): string | null {
  const key = ctx.factKey;
  return key !== undefined && isFactKey(key) && isDivisionFact(key) === division ? key : null;
}

/** How many of the closest facts a twin or example chooses from, so that the two can differ. */
const SIMILAR_CHOICES = 3;

/** The way to a Malaufgabe, comparable between facts: the known task it grows from and the factor that stays. */
function wayOf(a: number, b: number): string {
  const d = derivation(a, b);
  if (d) return `${d.name}:${d.vary}:${d.anchor}:${d.diff}`;
  const { k } = kernOf(a, b);
  return `kern:${k}:${a === k ? 'a' : 'b'}`;
}

/**
 * Malaufgaben closest to a · b: the same way first, else a fact with one factor in common, of the same kind if there is one (7 · 7 has no such fact).
 * Never the Tauschaufgabe: its result is on screen.
 */
function similarMul(a: number, b: number): [key: string, rank: number, distance: number][] {
  return MUL_FACT_KEYS.flatMap((key): [string, number, number][] => {
    const [x, y] = factFactors(key);
    if (x * y === a * b) return [];
    const distance = Math.abs(x - a) + Math.abs(y - b);
    if (wayOf(x, y) === wayOf(a, b)) return [[key, 0, distance]];
    if ((x !== a && y !== b) || (factKind(x, y) === 'kern') !== (factKind(a, b) === 'kern')) return [];
    return [[key, factKind(x, y) === factKind(a, b) ? 1 : 2, distance]];
  });
}

/** Geteiltaufgaben closest to p : d: the same divisor, a quotient of the same kind first. */
function similarDiv(p: number, d: number): [key: string, rank: number, distance: number][] {
  const q = p / d;
  return DIV_FACT_KEYS.flatMap((key): [string, number, number][] => {
    const [p2, d2] = factFactors(key);
    const q2 = p2 / d2;
    return d2 === d && q2 !== q ? [[key, isKern(q2) === isKern(q) ? 0 : 1, Math.abs(q2 - q)]] : [];
  });
}

/**
 * The Zwillingsaufgabe of a fact, or the example beside it: another fact of this kind that the same way solves (7 · 6 after 7 · 7, 42 : 7 after 56 : 7).
 * Not a pick from the pool of the slot's Stufe: a fact slot's Stufe only names the plain form, so that pool may not hold anything like the fact.
 */
export function similarFact(rng: Rng, ctx: Pick<GenContext, 'similarTo' | 'avoidFacts'>, division: boolean): string | null {
  const key = ctx.similarTo;
  if (key === undefined || !isFactKey(key) || isDivisionFact(key) !== division) return null;
  const [a, b] = factFactors(key);
  const all = (division ? similarDiv(a, b) : similarMul(a, b)).sort((x, y) => x[1] - y[1] || x[2] - y[2]);
  const free = all.filter(([k]) => !ctx.avoidFacts?.includes(k));
  return rng.pick((free.length > 0 ? free : all).slice(0, SIMILAR_CHOICES))[0];
}

// ─── Deriving a fact ──────────────────────────────────────────────────────────

/** The known task a hard fact grows from: in `vary`'s place stands `anchor`, and |diff| times the other factor comes on top or off. */
export interface Derivation {
  vary: 'a' | 'b';
  anchor: number;
  diff: number;
  /** The other factor. */
  other: number;
  name: 'Kernaufgabe' | 'Quadrataufgabe';
}

/** Null for Kernaufgaben. When both factors are two away from a Kernzahl (7 · 8), the Quadrataufgabe beside it is the nearer start. */
export function derivation(a: number, b: number): Derivation | null {
  if (factKind(a, b) === 'kern') return null;
  const da = Math.abs(a - NEAREST[a]);
  const db = Math.abs(b - NEAREST[b]);
  if (Math.min(da, db) >= 2 && Math.abs(a - b) === 1) {
    const sq = Math.min(a, b);
    return a === sq ? { vary: 'b', anchor: sq, diff: b - sq, other: a, name: 'Quadrataufgabe' } : { vary: 'a', anchor: sq, diff: a - sq, other: b, name: 'Quadrataufgabe' };
  }
  return da <= db ? { vary: 'a', anchor: NEAREST[a], diff: a - NEAREST[a], other: b, name: 'Kernaufgabe' } : { vary: 'b', anchor: NEAREST[b], diff: b - NEAREST[b], other: a, name: 'Kernaufgabe' };
}

/** The start of a derivation as a term: '5 · 7' for 6 · 7. */
export function anchorTerm(a: number, b: number, d: Derivation): string {
  return d.vary === 'a' ? mal(d.anchor, b) : mal(a, d.anchor);
}

/** What comes on top or off: '7' or '2 · 7'. */
const changeTerm = (d: Derivation) => (Math.abs(d.diff) === 1 ? String(d.other) : mal(Math.abs(d.diff), d.other));

/** The Kernzahl of a Kernaufgabe, and the other factor. Mal 1 goes first: 1 · 5 is no halving. */
function kernOf(a: number, b: number): { k: number; other: number } {
  const k = a === 1 || b === 1 ? 1 : ([2, 10, 5].find((f) => a === f || b === f) ?? 1);
  return { k, other: a === k ? b : a };
}

/** The way to a Kernaufgabe, without the result. The first factor counts the groups: 1 · 7 is the 7 once, 7 · 1 is 7-mal die 1. */
function kernRule(a: number, b: number): string {
  const { k, other } = kernOf(a, b);
  if (k === 1) return a === 1 ? 'Du nimmst die zweite Zahl genau einmal.' : 'Die erste Zahl sagt: Wie oft nimmst du die 1?';
  if (k === 2) return `Verdopple die ${other}.`;
  if (k === 10) return `${mal(a, b)} sind ${other} Zehner.`;
  return `${mal(5, other)} ist die Hälfte von ${mal(10, other)}.`;
}

/** First hint: a question that names the kind of help. */
export function malQuestion(a: number, b: number): string {
  const d = derivation(a, b);
  return d ? `Welche ${d.name} liegt in der Nähe?` : `Das ist eine Kernaufgabe. Was weißt du über mal ${kernOf(a, b).k}?`;
}

/** Second hint: the concrete way, never with the result. */
export function malHint(a: number, b: number): string {
  const d = derivation(a, b);
  if (!d) return kernRule(a, b);
  return `Nutze die ${d.name} ${anchorTerm(a, b, d)} = ${d.anchor * d.other}. Rechne dann ${changeTerm(d)} ${d.diff > 0 ? 'dazu' : 'weg'}.`;
}

/** The bug hint for a neighbouring fact (4 · 6 given as 18 or 28): the way again, shorter. */
export function fastHint(a: number, b: number): string {
  const d = derivation(a, b);
  if (!d) return `Fast! ${kernRule(a, b)}`;
  // §5: 'Fast! Rechne 2 · 6 und verdopple.'
  if (a === 4) return `Fast! Rechne ${mal(2, b)} und verdopple.`;
  return `Fast! Rechne ${anchorTerm(a, b, d)} und dann ${changeTerm(d)} ${d.diff > 0 ? 'dazu' : 'weg'}.`;
}

/** Worked steps with the child's numbers. The last one states the fact. */
export function malSteps(a: number, b: number): string[] {
  const p = a * b;
  const last = `Also: ${mal(a, b)} = ${p}.`;
  const d = derivation(a, b);
  if (!d) {
    const { k, other } = kernOf(a, b);
    if (k === 1) return [a === 1 ? `Du nimmst die ${b} genau einmal.` : `${a}-mal die 1: Du zählst bis ${a}.`, last];
    if (k === 2) return [`Verdopple die ${other}: ${other} + ${other} = ${p}.`, last];
    if (k === 10) return [`${mal(a, b)} sind ${other} Zehner.`, last];
    return [`${mal(10, other)} = ${10 * other}. Die Hälfte davon ist ${p}.`, last];
  }
  const start = d.anchor * d.other;
  const sign = d.diff > 0 ? '+' : '−';
  const change = Math.abs(d.diff) * d.other;
  const line = Math.abs(d.diff) === 1 ? `Einmal die ${d.other} ${d.diff > 0 ? 'mehr' : 'weniger'}: ${start} ${sign} ${d.other} = ${p}.` : `${Math.abs(d.diff)}-mal die ${d.other} ${d.diff > 0 ? 'mehr' : 'weniger'}: ${start} ${sign} ${change} = ${p}.`;
  return [`${d.name}: ${anchorTerm(a, b, d)} = ${start}.`, line, last];
}

/** The start of the search for the unknown factor q of q · d = p: a Kernzahl that is not q itself. */
export function searchStart(q: number): number {
  if (!isKern(q)) return NEAREST[q];
  return q === 5 ? 10 : 5;
}

/** Hint for the unknown factor: a Kernaufgabe with the known factor, never the fact. */
export function searchHint(q: number, d: number, p: number): string {
  if (d === 1) return 'Mal 1 ändert eine Zahl nicht.';
  const k = searchStart(q);
  return `Probiere ${mal(k, d)}. Das ist zu ${k * d < p ? 'wenig' : 'viel'} für ${p}.`;
}

/** Steps of that search; the last one states q · d = p. */
export function searchSteps(q: number, d: number): string[] {
  const p = q * d;
  if (d === 1) return [`Mal 1 ändert eine Zahl nicht: ${mal(q, 1)} = ${p}.`];
  if (isKern(q)) return [`Kernaufgabe: ${mal(q, d)} = ${p}. Das passt genau.`];
  const k = searchStart(q);
  const kp = k * d;
  const n = Math.abs(q - k);
  const rows = n === 1 ? `einmal die ${d}` : `${n}-mal die ${d}`;
  return [`Probiere: ${mal(k, d)} = ${kp}. Das ist zu ${kp < p ? 'wenig' : 'viel'}.`, kp < p ? `Bis ${p} fehlen ${p - kp}. Das ist noch ${rows}: ${mal(q, d)} = ${p}.` : `${kp} − ${p} = ${kp - p}. Das ist ${rows} zu viel: ${mal(q, d)} = ${p}.`];
}
