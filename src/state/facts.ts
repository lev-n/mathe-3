/**
 * Einmaleins fact keys (docs/research.md §2.2, §7.1): all 100 multiplication facts and 90 division facts are tracked, spaced, never
 * as rows and never against a clock.
 *
 * - 'axb', 1 ≤ a, b ≤ 10: a · b. The first factor counts groups (3 · 4 = 3-mal die 4), so 3 · 4 and 4 · 3 are two facts.
 * - 'p:d': p : d, with divisor d 1–10 and quotient 2–10. That is 90 facts: a : a = 1 is one rule, not ten facts, so those ten carry
 *   no key, and neither does division by 0.
 *
 * Each fact has a trainer skill: a review slot runs it with GenContext.factKey set (src/state/round.ts).
 */

/** The fact trainer of the Malaufgaben, owned by the kopfrechnen topic. */
export const EINMALEINS_SKILL_ID = 'kopfrechnen.einmaleins';
/** The fact trainer of the Geteiltaufgaben. */
export const UMKEHREN_SKILL_ID = 'kopfrechnen.umkehren';

const KERN_FACTORS: readonly number[] = [1, 2, 5, 10];
const isFactor = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10;

const MUL_RE = /^\s*(\d{1,2})\s*[x×·*]\s*(\d{1,2})\s*$/i;
const DIV_RE = /^\s*(\d{1,3})\s*[:÷]\s*(\d{1,2})\s*$/;

/** Canonical key ('7 · 2' → '7x2', '56 : 7' → '56:7'), or null if the key is not a tracked fact ('0x5', '11x2', '7:7', '7:2'). */
export function normalizeFactKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const mul = MUL_RE.exec(key);
  if (mul) {
    const a = Number(mul[1]);
    const b = Number(mul[2]);
    return isFactor(a) && isFactor(b) ? `${a}x${b}` : null;
  }
  const div = DIV_RE.exec(key);
  if (div) {
    const p = Number(div[1]);
    const d = Number(div[2]);
    if (!isFactor(d) || p % d !== 0) return null;
    const q = p / d;
    return q >= 2 && q <= 10 ? `${p}:${d}` : null;
  }
  return null;
}

/** true if `key` is already in canonical form. */
export function isFactKey(key: unknown): key is string {
  return typeof key === 'string' && normalizeFactKey(key) === key;
}

/** Exercise.factKey for a · b, undefined when this fact is not tracked (use it as `factKey: factKeyOf(a, b)`). */
export function factKeyOf(a: number, b: number): string | undefined {
  return normalizeFactKey(`${a}x${b}`) ?? undefined;
}

/** Exercise.factKey for p : d, undefined when this fact is not tracked. */
export function divFactKeyOf(p: number, d: number): string | undefined {
  return normalizeFactKey(`${p}:${d}`) ?? undefined;
}

export function isDivisionFact(key: string): boolean {
  return key.includes(':');
}

/** Numbers of a canonical key, in key order: [a, b] of a · b, [p, d] of p : d. */
export function factFactors(key: string): [number, number] {
  const [a, b] = key.split(/[x:]/).map(Number);
  return [a, b];
}

/** All 100 keys of the Malaufgaben, ordered by factors. */
export const MUL_FACT_KEYS: readonly string[] = Array.from({ length: 10 }, (_, a) => Array.from({ length: 10 }, (_b, b) => `${a + 1}x${b + 1}`)).flat();

/** All 90 keys of the Geteiltaufgaben, ordered by divisor, then quotient. */
export const DIV_FACT_KEYS: readonly string[] = Array.from({ length: 10 }, (_, d) => Array.from({ length: 9 }, (_q, q) => `${(q + 2) * (d + 1)}:${d + 1}`)).flat();

/** Every tracked fact (190 keys). */
export const ALL_FACT_KEYS: readonly string[] = [...MUL_FACT_KEYS, ...DIV_FACT_KEYS];

/** Kernaufgaben: Malaufgaben with a factor 1, 2, 5 or 10 (64 keys). */
export const KERN_FACT_KEYS: readonly string[] = MUL_FACT_KEYS.filter((k) => factFactors(k).some((f) => KERN_FACTORS.includes(f)));

/** The skill that owns a fact: a review slot for the fact runs this skill with GenContext.factKey set. */
export function factSkillId(key: string): string {
  return isDivisionFact(key) ? UMKEHREN_SKILL_ID : EINMALEINS_SKILL_ID;
}

/** Ordering of fact keys: Malaufgaben by factors, then Geteiltaufgaben by divisor and quotient. */
export function compareFactKeys(a: string, b: string): number {
  const divA = isDivisionFact(a);
  const divB = isDivisionFact(b);
  if (divA !== divB) return divA ? 1 : -1;
  const [a1, a2] = factFactors(a);
  const [b1, b2] = factFactors(b);
  return divA ? a2 - b2 || a1 - b1 : a1 - b1 || a2 - b2;
}
