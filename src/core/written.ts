/**
 * Layout engine for written calculations (schriftliche Rechenverfahren).
 *
 * Pure arithmetic: computes carries (Überträge) and Entbündeln/Erweitern marks. Shared by the generators (worked steps), the bug
 * library, WrittenVisual and WrittenInput; it lives here and not in a topic directory because the UI imports it statically
 * (src/topics/contract.test.ts). Klasse 3 needs plus, minus and one-digit mal only (docs/research.md §2.2): no written division and
 * no multi-digit second factor.
 *
 * Places are counted from the right: 0 = Einer, 1 = Zehner, 2 = Hunderter, 3 = Tausender.
 */
import type { SubtractionMethod, VisualOf, WrittenOp } from './types';

// ─── Place names ─────────────────────────────────────────────────────────────

const PLACE_NOM = ['Einer', 'Zehner', 'Hunderter', 'Tausender'];
const PLACE_DAT = ['Einern', 'Zehnern', 'Hundertern', 'Tausendern'];
const PLACE_ONE = ['einen Einer', 'einen Zehner', 'einen Hunderter', 'einen Tausender'];
const PLACE_SHORT = ['E', 'Z', 'H', 'T'];

/** 'Einer', 'Zehner', … (also the plural). */
export function placeName(place: number): string {
  return PLACE_NOM[place] ?? `${place + 1}. Stelle`;
}
/** Dative plural: 'bei den Zehnern'. */
export function placeDative(place: number): string {
  return PLACE_DAT[place] ?? `${place + 1}. Stelle`;
}
/** 'einen Zehner' (accusative singular, for Entbündeln). */
export function placeOne(place: number): string {
  return PLACE_ONE[place] ?? 'eine Stelle';
}
/** Stellentafel abbreviation: 'E', 'Z', 'H', 'T'. */
export function placeShort(place: number): string {
  return PLACE_SHORT[place] ?? '';
}

// ─── Digits ──────────────────────────────────────────────────────────────────

/** Number of digits of a non-negative integer (0 has one digit). */
export function numLength(n: number): number {
  return String(Math.abs(Math.trunc(n))).length;
}

/** Digit at a place (0 = Einer). */
export function digitAt(n: number, place: number): number {
  return Math.floor(n / 10 ** place) % 10;
}

/** Big-endian digits: 543 → [5, 4, 3]. */
export function digitsOf(n: number): number[] {
  return String(n).split('').map(Number);
}

// ─── Addition ────────────────────────────────────────────────────────────────

export interface AddLayout {
  op: 'add';
  operands: number[];
  /** Number of columns of the solution (max operand length, +1 if the result is longer). */
  width: number;
  /** carries[p] = Übertrag written into place p (from place p − 1); carries[0] = 0. Length = width. */
  carries: number[];
  /** Column sum at each place including the incoming carry. Length = width. */
  columnSums: number[];
  result: number;
}

export function layoutAdd(operands: readonly number[]): AddLayout {
  const maxLen = Math.max(...operands.map(numLength));
  const carries: number[] = [0];
  const columnSums: number[] = [];
  let carry = 0;
  for (let p = 0; p < maxLen || carry > 0; p++) {
    let s = carry;
    for (const n of operands) if (numLength(n) > p) s += digitAt(n, p);
    columnSums.push(s);
    carry = Math.floor(s / 10);
    carries.push(carry);
  }
  carries.length = columnSums.length;
  return {
    op: 'add',
    operands: operands.slice(),
    width: columnSums.length,
    carries,
    columnSums,
    result: operands.reduce((a, b) => a + b, 0),
  };
}

// ─── Subtraction ─────────────────────────────────────────────────────────────

export interface SubColumn {
  place: number;
  /** Original Minuend digit. */
  a: number;
  /** Subtrahend digit, null if the Subtrahend has no digit at this place. */
  b: number | null;
  /** Abziehen: the Minuend value at this place when the column is reached (after earlier Entbündeln). */
  before: number;
  /** Abziehen: value used for subtracting (after own Entbündeln). Shown small above the marked digit if ≠ a. */
  top: number;
  /** Abziehen: this column needed Entbündeln (top = before + 10). */
  regrouped: boolean;
  /** Abziehen: place the bundle was taken from (> place + 1 means Entbündeln across zeros). */
  regroupFrom?: number;
  /** Ergänzen: the gemerkte 1 added to the Subtrahend digit at this place (0 or 1). */
  carryIn: number;
  /** Ergänzen: the Minuend digit was extended by 10. */
  extended: boolean;
  /** Result digit. */
  r: number;
}

export interface SubLayout {
  op: 'sub';
  method: SubtractionMethod;
  minuend: number;
  subtrahend: number;
  width: number;
  columns: SubColumn[];
  result: number;
  /** Number of Entbündeln (abziehen) or Erweitern (ergaenzen) steps. */
  regroupings: number;
  /** Abziehen: Entbündeln across a zero happened; Ergänzen: a zero in the Minuend was extended. */
  acrossZero: boolean;
}

export function layoutSub(minuend: number, subtrahend: number, method: SubtractionMethod): SubLayout {
  if (subtrahend > minuend) throw new RangeError(`layoutSub: ${minuend} − ${subtrahend} < 0`);
  const width = numLength(minuend);
  const lb = numLength(subtrahend);
  const a = Array.from({ length: width }, (_, p) => digitAt(minuend, p));
  const bAt = (p: number): number | null => (p < lb ? digitAt(subtrahend, p) : null);
  const columns: SubColumn[] = [];
  let regroupings = 0;
  let acrossZero = false;

  if (method === 'abziehen') {
    const t = a.slice();
    for (let p = 0; p < width; p++) {
      const b = bAt(p) ?? 0;
      const before = t[p];
      let regrouped = false;
      let regroupFrom: number | undefined;
      if (t[p] < b) {
        let j = p + 1;
        while (t[j] === 0) j++;
        t[j] -= 1;
        for (let k = p + 1; k < j; k++) t[k] = 9;
        t[p] += 10;
        regrouped = true;
        regroupFrom = j;
        regroupings++;
        if (j > p + 1) acrossZero = true;
      }
      columns.push({ place: p, a: a[p], b: bAt(p), before, top: t[p], regrouped, regroupFrom, carryIn: 0, extended: false, r: t[p] - b });
    }
  } else {
    let c = 0;
    for (let p = 0; p < width; p++) {
      const b = bAt(p) ?? 0;
      const s = b + c;
      const extended = a[p] < s;
      const r = extended ? a[p] + 10 - s : a[p] - s;
      if (extended) {
        regroupings++;
        if (a[p] === 0) acrossZero = true;
      }
      columns.push({ place: p, a: a[p], b: bAt(p), before: a[p], top: a[p], regrouped: false, carryIn: c, extended, r });
      c = extended ? 1 : 0;
    }
  }
  return { op: 'sub', method, minuend, subtrahend, width, columns, result: minuend - subtrahend, regroupings, acrossZero };
}

// ─── Multiplication (one-digit second factor, Sachsen only: docs/research.md §6) ─

export interface MulLayout {
  op: 'mul';
  a: number;
  b: number;
  /** carries[p] = Übertrag into place p of the result. */
  carries: number[];
  result: number;
  /** Number of carries (Stufe bounds, praise). */
  carryCount: number;
}

export function layoutMul(a: number, b: number): MulLayout {
  if (b < 0 || b > 9) throw new RangeError(`layoutMul: the second factor has one digit: ${b}`);
  const la = numLength(a);
  const carries = [0];
  let c = 0;
  for (let p = 0; p < la; p++) {
    const v = digitAt(a, p) * b + c;
    c = Math.floor(v / 10);
    carries.push(c);
  }
  const carryCount = carries.filter((v, i) => i > 0 && i < la && v > 0).length;
  return { op: 'mul', a, b, carries, result: a * b, carryCount };
}

// ─── Generic ─────────────────────────────────────────────────────────────────

export function correctResult(op: WrittenOp, operands: readonly number[]): number {
  switch (op) {
    case 'add':
      return operands.reduce((a, b) => a + b, 0);
    case 'sub':
      return operands[0] - operands[1];
    case 'mul':
      return operands[0] * operands[1];
  }
}

/** Rightmost place at which two numbers differ (−1 if equal). */
export function firstDiffPlace(x: number, y: number): number {
  const len = Math.max(numLength(x), numLength(y));
  for (let p = 0; p < len; p++) if (digitAt(x, p) !== digitAt(y, p)) return p;
  return -1;
}


/** Build a 'written' visual; drops undefined fields so exercises stay plain JSON. */
export function writtenVisual(spec: VisualOf<'written'>): VisualOf<'written'> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(spec)) if (v !== undefined) out[k] = v;
  return out as VisualOf<'written'>;
}
