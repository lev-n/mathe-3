/**
 * Bug library of the written calculations (docs/research.md §5). Each candidate computes the exact wrong result of one misconception, or
 * null when the numbers do not show it. A candidate has the hint for that result and a short label for the Fehlerdetektiv.
 *
 * The two subtraction methods share their Bug ids and differ in hint, label and sometimes in value: §5 names `entbuendeln-vergessen` and
 * `uebertrag-ergaenzen` as one misconception, and the error library tags it per skill, not per method.
 */
import { MINUS, TIMES, fmt } from '../../core/format';
import type { Bug, SubtractionMethod, WrittenOp } from '../../core/types';
import { correctResult, digitAt, layoutAdd, layoutMul, layoutSub, numLength, placeDative, placeName, placeOne } from '../../core/written';
import { bugList } from '../shared';

export interface BugCandidate {
  id: string;
  /** The wrong result; null if these numbers do not show the misconception. */
  value: number | null;
  hint: string;
  /** Fehlerdetektiv: what went wrong, as an answer option. */
  label: string;
  /**
   * Is the label a fair reading of this wrong result? It looks at the columns, not at `value`: a result can be left out above (belowTop)
   * and still show this mistake, and two labels can describe one mistake ('Der Übertrag fehlt.' and 'Vorne fehlt der letzte Übertrag.').
   */
  fits: (shown: number) => boolean;
}

const longest = (ops: readonly number[]) => Math.max(...ops.map(numLength));
const columnDigits = (ops: readonly number[], p: number) => ops.filter((n) => numLength(n) > p).map((n) => digitAt(n, p));
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const placesUpTo = (width: number) => Array.from({ length: width }, (_, p) => p);

/** The digit of `shown` at place p is the right digit plus `diff`, within one column. */
const digitOff = (shown: number, correct: number, p: number, diff: number) => digitAt(shown, p) === (digitAt(correct, p) + diff + 10) % 10;

/** The Sprechweise of Ergänzen: 'Von 4 bis 7 fehlen 3.', 'Von 4 bis 5 fehlt 1.' */
export function missingLine(from: number, to: number): string {
  return `Von ${from} bis ${to} ${to - from === 1 ? 'fehlt' : 'fehlen'} ${to - from}.`;
}

// ─── Plus ────────────────────────────────────────────────────────────────────

/** Column addition; `rule` may change what one column writes and carries (null: as usual). */
function addWith(ops: readonly number[], rule: (p: number, digits: number[], carry: number) => { write: number; carry: number } | null): number {
  const len = longest(ops);
  let carry = 0;
  let out = 0;
  for (let p = 0; p < len; p++) {
    const digits = columnDigits(ops, p);
    const s = sum(digits) + carry;
    const r = rule(p, digits, carry) ?? { write: s % 10, carry: Math.floor(s / 10) };
    out += r.write * 10 ** p;
    carry = r.carry;
  }
  return out + carry * 10 ** len;
}

/** '1 Hunderter kommt', but 'Die 2 Hunderter kommen': 'Die 1 Hunderter' is no German. */
const carryWord = (carry: number) => (carry === 1 ? '1' : `Die ${carry}`);

function carryGoesTo(p: number, carry: number): string {
  const subject = `${carryWord(carry)} ${placeName(p + 1)}`;
  const verb = carry === 1 ? 'kommt' : 'kommen';
  return p === 0 ? `${subject} ${verb} zur Zehnerspalte.` : `${subject} ${verb} zu den ${placeDative(p + 1)}.`;
}

export function addCandidates(ops: readonly number[]): BugCandidate[] {
  const len = longest(ops);
  const total = sum(ops);
  const shortest = Math.min(...ops);
  const sums = Array.from({ length: len }, (_, p) => sum(columnDigits(ops, p)));
  const firstCarry = sums.findIndex((s) => s >= 10);

  // the first column of each pattern, with the carry that really arrives there
  let zeroPlace = -1;
  let zeroDigits: number[] = [];
  let zeroCarry = 0;
  let ninePlace = -1;
  // a Übertrag arriving makes this column another mistake: its digit is not the one the hint and the label name
  let plusNull = -1;
  addWith(ops, (p, digits, carry) => {
    if (zeroPlace < 0 && carry > 0 && digits.every((d) => d === 0)) {
      zeroPlace = p;
      zeroDigits = digits;
      zeroCarry = carry;
    }
    if (ninePlace < 0 && p < len - 1 && sum(digits) + carry === 9) ninePlace = p;
    if (plusNull < 0 && carry === 0 && digits.length === 2 && digits.filter((d) => d === 0).length === 1) plusNull = p;
    return null;
  });
  const other = plusNull < 0 ? 0 : Math.max(...columnDigits(ops, plusNull));

  const { carries, width } = layoutAdd(ops);
  const places = placesUpTo(width);
  const carryLost = (shown: number, p: number) => carries[p] > 0 && digitOff(shown, total, p, -carries[p]);
  const lastCarry = carries.reduce((last, c, p) => (c > 0 ? p : last), -1);

  return [
    {
      id: 'nicht-stellengerecht',
      value: ops.every((n) => numLength(n) === len) ? null : sum(ops.map((n) => n * 10 ** (len - numLength(n)))),
      hint: `Einer unter Einer, Zehner unter Zehner. Schreib die ${fmt(shortest)} nach rechts.`,
      label: 'Die Zahlen stehen nicht richtig untereinander.',
      fits: (shown) => ops.some((n) => numLength(n) < len) && shown === sum(ops.map((n) => n * 10 ** (len - numLength(n)))),
    },
    {
      id: 'leerstelle',
      value: numLength(total) > len ? total % 10 ** len : null,
      hint: `Schreib den letzten Übertrag vorne hin. Das ist der ${placeName(len)}.`,
      label: 'Vorne fehlt der letzte Übertrag.',
      fits: (shown) => lastCarry >= len - 1 && carryLost(shown, lastCarry),
    },
    {
      id: 'uebertrag-zur-null',
      value: zeroPlace < 0 ? null : addWith(ops, (p) => (p === zeroPlace ? { write: 0, carry: 0 } : null)),
      hint: `Auch zur 0 kommt der Übertrag: ${[...zeroDigits, zeroCarry].join(' + ')}.`,
      label: 'Bei der 0 fehlt der Übertrag.',
      fits: (shown) => places.some((p) => p < len && columnDigits(ops, p).every((d) => d === 0) && carryLost(shown, p)),
    },
    {
      id: 'uebertrag-zu-viel',
      value: ninePlace < 0 ? null : addWith(ops, (p) => (p === ninePlace ? { write: 9, carry: 1 } : null)),
      hint: `Bei den ${ninePlace < 0 ? '' : placeDative(ninePlace)} sind es nur 9. Dann gibt es keinen Übertrag.`,
      label: 'Hier steht ein Übertrag zu viel.',
      fits: (shown) => places.some((p) => digitOff(shown, total, p, 1)),
    },
    {
      id: 'null-plus',
      value: plusNull < 0 ? null : addWith(ops, (p) => (p === plusNull ? { write: 0, carry: 0 } : null)),
      hint: `0 + ${other} bleibt ${other}. Null dazu ändert nichts.`,
      label: `Bei 0 + ${other || 1} steht einfach 0.`,
      // Without such a column the label says 0 + 1: then it describes a column of 0 + 0 whose Übertrag got lost.
      fits: (shown) => {
        const place = plusNull >= 0 ? plusNull : zeroPlace;
        return place >= 0 && digitAt(shown, place) === 0 && digitAt(total, place) !== 0;
      },
    },
    {
      id: 'uebertrag-vergessen',
      value: firstCarry < 0 ? null : addWith(ops, (p, digits) => (p === len - 1 ? { write: sum(digits), carry: 0 } : { write: sum(digits) % 10, carry: 0 })),
      hint: firstCarry < 0 ? '' : `${columnDigits(ops, firstCarry).join(' + ')} sind ${sums[firstCarry]}. ${carryGoesTo(firstCarry, Math.floor(sums[firstCarry] / 10))}`,
      label: 'Der Übertrag fehlt.',
      fits: (shown) => places.some((p) => carryLost(shown, p)),
    },
    {
      id: 'von-links',
      value: firstCarry < 0 ? null : fromTheLeft(ops),
      hint: 'Fang bei den Einern an. Das ist rechts.',
      label: 'Die Rechnung beginnt links.',
      fits: (shown) => firstCarry >= 0 && shown === fromTheLeft(ops),
    },
  ];
}

/** Starts at the Hunderter: a carry lands in the column to the right, and the last one is lost. */
function fromTheLeft(ops: readonly number[]): number {
  let carry = 0;
  let out = 0;
  for (let p = longest(ops) - 1; p >= 0; p--) {
    const s = sum(columnDigits(ops, p)) + carry;
    out += (s % 10) * 10 ** p;
    carry = Math.floor(s / 10);
  }
  return out;
}

// ─── Minus ───────────────────────────────────────────────────────────────────

interface SubColumnStep {
  r: number;
  borrow: number;
}

/** Column subtraction; `rule` may change one column (null: as usual). Null if the wrong way ends below zero. */
function subWith(a: number, b: number, rule: (p: number, top: number, low: number, borrow: number) => SubColumnStep | null): number | null {
  const width = numLength(a);
  let borrow = 0;
  let out = 0;
  for (let p = 0; p < width; p++) {
    const top = digitAt(a, p);
    const low = p < numLength(b) ? digitAt(b, p) : 0;
    const usual = top - borrow < low ? { r: top - borrow + 10 - low, borrow: 1 } : { r: top - borrow - low, borrow: 0 };
    const step = rule(p, top, low, borrow) ?? usual;
    out += step.r * 10 ** p;
    borrow = step.borrow;
  }
  return borrow > 0 ? null : out;
}

/** Every column on its own: oben zu wenig gives 10 more, and nothing changes to the left. */
function columnsAlone(a: number, b: number): number {
  let out = 0;
  for (let p = 0; p < numLength(a); p++) {
    const top = digitAt(a, p);
    const low = p < numLength(b) ? digitAt(b, p) : 0;
    out += (top < low ? top + 10 - low : top - low) * 10 ** p;
  }
  return out;
}

/** A wrong value above the top number is no result a child would keep (for example 1000 − 233 as 1877). */
const belowTop = (value: number | null, a: number) => (value !== null && value < a ? value : null);

/** The Einer of 756 − 94 can stay above the top number (762), but no such result reaches 1000. */
const upTo999 = (value: number | null) => (value !== null && value < 1000 ? value : null);

export function subCandidates(a: number, b: number, method: SubtractionMethod): BugCandidate[] {
  const abziehen = method === 'abziehen';
  const result = a - b;
  const width = numLength(a);
  const lb = numLength(b);
  const places = Array.from({ length: width }, (_, p) => p);
  const low = (p: number) => (p < lb ? digitAt(b, p) : 0);
  const tooSmall = places.find((p) => digitAt(a, p) < low(p));
  // Abziehen: the place that can give when `p` needs more, which is beyond any 0 on top
  const giver = (p: number) => places.find((q) => q > p && digitAt(a, q) > 0) ?? p + 1;

  const zeroTop = places.find((p) => {
    const below = places.slice(0, p).some((q) => digitAt(a, q) % 10 < low(q));
    return digitAt(a, p) === 0 && low(p) > 0 && !below;
  });
  const zeroLow = places.find((p) => p < lb && low(p) === 0 && digitAt(result, p) > 0);

  const across = layoutSub(a, b, 'abziehen').columns.find((c) => c.regrouped && (c.regroupFrom ?? 0) > c.place + 1);
  const carryIntoZero = layoutSub(a, b, 'ergaenzen').columns.find((c) => c.a === 0 && c.carryIn === 1);
  const overZero = abziehen
    ? across
      ? columnsAlone(a, b) % (a === 1000 ? 1000 : 10 ** 4)
      : null
    : carryIntoZero
      ? subWith(a, b, (_p, top, lower, borrow) => {
          if (top !== 0 || borrow !== 1) return null;
          return lower === 0 ? { r: 0, borrow: 0 } : { r: 10 - lower, borrow: 1 };
        })
      : null;

  // equal digits with no Übertrag arriving, the column to the left then loses 1
  let samePlace = -1;
  subWith(a, b, (p, top, lower, borrow) => {
    if (samePlace < 0 && p < lb && p < width - 1 && top > 0 && top === lower && borrow === 0) samePlace = p;
    return null;
  });
  const sameDigit = samePlace < 0 ? 0 : digitAt(a, samePlace);

  let lostPlace = -1;
  if (lb < width) subWith(a, b, (p, _top, _lower, borrow) => {
    if (p === lb && borrow === 1) lostPlace = p;
    return null;
  });
  const lostName = placeName(lb);

  const overZeros = (p: number) => {
    const zeros = giver(p) - p - 1;
    return zeros === 0 ? '' : ` über die ${zeros === 1 ? '0' : 'Nullen'}`;
  };
  const zeroLowColumn = zeroLow === undefined ? undefined : layoutSub(a, b, 'ergaenzen').columns[zeroLow];

  // the Übertrag reaches the same columns in both methods; a column that loses it shows one more than the right digit
  const reached = layoutSub(a, b, 'ergaenzen').columns.map((c) => c.carryIn === 1);
  const carryLost = (shown: number, p: number) => reached[p] && digitOff(shown, result, p, 1);
  const smallFromLarge = sum(places.map((p) => Math.abs(digitAt(a, p) - low(p)) * 10 ** p));

  return [
    {
      id: 'nicht-stellengerecht',
      value: lb === width ? null : a - b * 10 ** (width - lb),
      hint: `Einer unter Einer, Zehner unter Zehner. Schreib die ${fmt(b)} nach rechts.`,
      label: 'Die Zahlen stehen nicht richtig untereinander.',
      fits: (shown) => lb !== width && shown === a - b * 10 ** (width - lb),
    },
    {
      id: 'ueber-die-null',
      value: belowTop(overZero, a),
      hint: abziehen
        ? across ? `Bei 0 ${placeDative(across.place + 1)} wechselst du zuerst ${placeOne(across.regroupFrom ?? across.place + 1)}.` : ''
        : carryIntoZero ? `Auch bei der 0 zählt der Übertrag: ${carryIntoZero.b ?? 0} + 1 = ${(carryIntoZero.b ?? 0) + 1}.` : '',
      label: abziehen ? 'Beim Wechseln über die 0 fehlt ein Schritt.' : 'Bei der 0 fehlt der Übertrag.',
      fits: (shown) => places.some((p) => digitAt(a, p) === 0 && carryLost(shown, p)),
    },
    {
      id: 'stellenzahl',
      value: lostPlace < 0 ? null : upTo999(subWith(a, b, (p, top) => (p === lostPlace ? { r: top, borrow: 0 } : null))),
      hint: abziehen
        ? `Die ${fmt(b)} hat keine ${lostName}. Du wechselst trotzdem ${placeOne(giver(lb - 1))}.`
        : `Die ${fmt(b)} hat keine ${lostName}. Der Übertrag 1 kommt trotzdem dazu.`,
      label: abziehen ? 'Vorne fehlt der Wechsel.' : 'Vorne fehlt der Übertrag.',
      fits: (shown) => places.some((p) => (p >= lb || p === width - 1) && carryLost(shown, p)),
    },
    {
      id: 'null-minus',
      value: belowTop(zeroTop === undefined ? null : subWith(a, b, (_p, top, lower, borrow) => (top === 0 && lower > 0 && borrow === 0 ? { r: 0, borrow: 0 } : null)), a),
      hint: zeroTop === undefined
        ? ''
        : abziehen
          ? `0 ${MINUS} ${low(zeroTop)} geht nicht. Wechsle ${placeOne(giver(zeroTop))}${overZeros(zeroTop)}.`
          : `Von ${low(zeroTop)} bis 0 geht nicht. Erweitere oben: Von ${low(zeroTop)} bis 10.`,
      label: 'Bei der 0 oben steht einfach 0.',
      fits: (shown) => places.some((p) => digitAt(a, p) === 0 && low(p) > 0 && digitAt(shown, p) === 0 && digitAt(result, p) !== 0),
    },
    {
      id: 'minus-null',
      value: zeroLow === undefined ? null : result - digitAt(result, zeroLow) * 10 ** zeroLow,
      hint: abziehen
        ? `Nichts abziehen heißt: Die ${zeroLow === undefined ? 0 : digitAt(result, zeroLow)} bleibt.`
        : zeroLowColumn
          ? `${zeroLowColumn.carryIn ? '0 + 1 = 1. ' : ''}${missingLine(zeroLowColumn.carryIn, zeroLowColumn.extended ? zeroLowColumn.a + 10 : zeroLowColumn.a)}`
          : '',
      label: abziehen ? `Bei ${zeroLow === undefined ? 4 : digitAt(result, zeroLow)} ${MINUS} 0 steht einfach 0.` : 'Bei der 0 unten steht einfach 0.',
      fits: (shown) => zeroLow !== undefined && digitAt(shown, zeroLow) === 0,
    },
    {
      id: 'gleiche-ziffern',
      value: samePlace < 0 ? null : subWith(a, b, (p) => (p === samePlace ? { r: 0, borrow: 1 } : null)),
      hint: abziehen ? `${sameDigit} ${MINUS} ${sameDigit} sind 0. Hier wechselst du nichts.` : `Von ${sameDigit} bis ${sameDigit} fehlen 0. Hier gibt es keinen Übertrag.`,
      label: abziehen ? 'Bei gleichen Ziffern steht ein Wechsel.' : 'Bei gleichen Ziffern steht ein Übertrag.',
      fits: (shown) => samePlace >= 0 && digitOff(shown, result, samePlace + 1, -1),
    },
    {
      id: 'uebertrag-minus',
      value: tooSmall === undefined ? null : belowTop(columnsAlone(a, b), a),
      hint: tooSmall === undefined
        ? ''
        : abziehen
          ? `Du hast ${placeOne(giver(tooSmall))} gewechselt. Oben ist nun einer weniger.`
          : `Du hast erweitert. Der ${placeName(tooSmall + 1)} unten bekommt 1 dazu.`,
      label: abziehen ? 'Nach dem Wechseln steht oben nicht 1 weniger.' : 'Unten fehlt der Übertrag 1.',
      fits: (shown) => places.some((p) => carryLost(shown, p)),
    },
    {
      id: 'kleiner-von-groesser',
      value: tooSmall === undefined ? null : smallFromLarge,
      hint: tooSmall === undefined
        ? ''
        : `Oben steht die ${digitAt(a, tooSmall)}, unten die ${low(tooSmall)}. ${abziehen ? 'Rechne von oben nach unten.' : 'Ergänze von unten nach oben.'}`,
      label: abziehen ? 'Hier steht unten minus oben.' : 'Das Ergänzen geht hier von oben nach unten.',
      fits: (shown) => tooSmall !== undefined && (shown === smallFromLarge || places.some((p) => digitAt(a, p) < low(p) && digitAt(shown, p) === low(p) - digitAt(a, p) && digitAt(shown, p) !== digitAt(result, p))),
    },
    { id: 'plus-statt-minus', value: a + b, hint: 'Schau noch einmal auf das Rechenzeichen.', label: 'Hier steht plus statt minus.', fits: (shown) => shown === a + b },
  ];
}

// ─── Mal ─────────────────────────────────────────────────────────────────────

export function mulCandidates(a: number, m: number): BugCandidate[] {
  const la = numLength(a);
  const lay = layoutMul(a, m);
  const firstCarry = Array.from({ length: la }, (_, p) => p).find((p) => lay.carries[p + 1] > 0);
  const zero = Array.from({ length: la }, (_, p) => p).find((p) => digitAt(a, p) === 0 && lay.carries[p] > 0);

  const without = Array.from({ length: la }, (_, p) => digitAt(a, p) * m).reduce((out, v, p) => out + (p === la - 1 ? v : v % 10) * 10 ** p, 0);
  let lost = 0;
  if (zero !== undefined) {
    let c = 0;
    for (let p = 0; p < la; p++) {
      const v = digitAt(a, p) * m + (p === zero ? 0 : c);
      const v2 = p === la - 1 ? v : v % 10;
      lost += v2 * 10 ** p;
      c = Math.floor(v / 10);
    }
  }
  const d = firstCarry === undefined ? 0 : digitAt(a, firstCarry);
  const v = firstCarry === undefined ? 0 : d * m + lay.carries[firstCarry];
  const carry = Math.floor(v / 10);
  const carriedTo = firstCarry === undefined ? '' : placeName(firstCarry + 1);

  const places = placesUpTo(la);
  const carryLost = (shown: number, p: number) => lay.carries[p] > 0 && digitOff(shown, a * m, p, -lay.carries[p]);

  return [
    {
      id: 'uebertrag-zur-null',
      value: zero === undefined ? null : lost,
      hint: zero === undefined ? '' : `Auch zur 0 kommt der Übertrag: ${m} ${TIMES} 0 + ${lay.carries[zero]}.`,
      label: 'Bei der 0 fehlt der Übertrag.',
      fits: (shown) => places.some((p) => digitAt(a, p) === 0 && carryLost(shown, p)),
    },
    {
      id: 'mal-uebertrag',
      value: firstCarry === undefined ? null : without,
      hint: firstCarry === undefined ? '' : `${m} ${TIMES} ${d} sind ${d * m}. ${carryWord(carry)} ${carriedTo} ${carry === 1 ? 'kommt' : 'kommen'} zur nächsten Spalte.`,
      label: 'Der Übertrag fehlt.',
      fits: (shown) => places.some((p) => carryLost(shown, p)),
    },
    { id: 'rechenzeichen', value: a + m, hint: 'Schau noch einmal auf das Rechenzeichen.', label: 'Hier steht plus statt mal.', fits: (shown) => shown === a + m },
    // answer options only: with few mistakes of its own, Mal would otherwise offer a single other option
    { id: 'mal-zu-viel', value: null, hint: '', label: 'Hier steht ein Übertrag zu viel.', fits: (shown) => places.some((p) => digitOff(shown, a * m, p, 1)) },
    { id: 'mal-einer', value: null, hint: '', label: 'Bei den Einern stimmt etwas nicht.', fits: (shown) => digitAt(shown, 0) !== digitAt(a * m, 0) },
  ];
}

// ─── All ─────────────────────────────────────────────────────────────────────

export function candidatesFor(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): BugCandidate[] {
  if (op === 'add') return addCandidates(operands);
  if (op === 'sub') return subCandidates(operands[0], operands[1], method);
  return mulCandidates(operands[0], operands[1]);
}

/** The other mistakes as wrong answer options: one per label, and none that also describes the result on screen. */
export function otherReadings(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, planted: BugCandidate, shown: number): BugCandidate[] {
  const seen = new Set<string>([planted.label]);
  return candidatesFor(op, operands, method).filter((c) => {
    if (c.fits(shown) || seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });
}

/** The Bug list of a written calculation: only wrong results that differ from the correct one and from each other. */
export function bugsFor(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): Bug[] {
  const result = correctResult(op, operands);
  return bugList(result, candidatesFor(op, operands, method).map((c) => [c.id, c.value, c.hint]));
}
