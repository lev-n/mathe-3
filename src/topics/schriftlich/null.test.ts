import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { digitAt } from '../../core/written';
import { columnSteps } from './common';
import { nullSkill } from './null';
import { METHODS, at, expectPasst, minusRegroupings, sharedChecks, writtenOf } from './test-helpers';

describeSkill(nullSkill);

/** Worked by hand, without the layout engine: the digit on top of each place when the calculation reaches it. */
function topsWhenReached(a: number, b: number): number[] {
  const top = String(a).split('').reverse().map(Number);
  const low = (p: number) => Math.floor(b / 10 ** p) % 10;
  return top.map((_, p) => {
    const reached = top[p];
    if (top[p] < low(p)) {
      let from = p + 1;
      while (top[from] === 0) top[from++] = 9;
      top[from] -= 1;
    }
    return reached;
  });
}

describe('schriftlich.null', () => {
  sharedChecks(nullSkill);

  const pairs = (stufe: 1 | 2 | 3, ab: 1 | 2) =>
    at(nullSkill, stufe, ab).map((ex) => {
      const { operands: [a, b], result } = writtenOf(ex);
      expect(result, ex.key).toBe(a - b);
      return [a, b, ex.key] as const;
    });

  /** A 0 on top at a place with a digit below. */
  const zeroOnTop = (a: number, b: number) => [0, 1].some((p) => digitAt(a, p) === 0 && digitAt(b, p) > 0);
  /** The Wechsel reaches over a 0 on top: worked by hand. */
  const overZero = (a: number, b: number) => minusRegroupings(a, b).some((p) => digitAt(a, p + 1) === 0);

  it('Stufe 1: the 0 stands below, nothing to regroup; then equal digits as well; then the task to a result', () => {
    for (const ab of [1, 2] as const) {
      for (const [a, b, key] of pairs(1, ab)) {
        expect(String(a), key).not.toContain('0');
        expect(digitAt(b, 0) === 0 || digitAt(b, 1) === 0, key).toBe(true);
        expect(minusRegroupings(a, b), key).toEqual([]);
        expect(a - b, key).toBeGreaterThanOrEqual(100);
      }
    }
    for (const [a, b, key] of pairs(1, 1)) expect([0, 1].every((p) => digitAt(a, p) !== digitAt(b, p)), key).toBe(true);
    for (const [a, b, key] of pairs(1, 2)) expect([0, 1].some((p) => digitAt(b, p) > 0 && digitAt(a, p) === digitAt(b, p)), key).toBe(true);
    for (const ex of at(nullSkill, 1, 3)) expectPasst(ex, (x, y) => minusRegroupings(x, y).length === 0 && (digitAt(y, 0) === 0 || digitAt(y, 1) === 0) && !String(x).includes('0'));
  });

  it('Stufe 2: the 0 stands above, the neighbour can give: once, then 2-mal, then the task to a result', () => {
    for (const [a, b, key] of pairs(2, 1)) {
      expect(zeroOnTop(a, b), key).toBe(true);
      expect(minusRegroupings(a, b).length, key).toBe(1);
      expect(overZero(a, b), key).toBe(false);
    }
    for (const [a, b, key] of pairs(2, 2)) {
      expect(digitAt(a, 0), key).toBe(0);
      expect(minusRegroupings(a, b), key).toEqual([0, 1]);
      expect(overZero(a, b), key).toBe(false);
    }
    for (const ex of at(nullSkill, 2, 3)) expectPasst(ex, (x, y) => zeroOnTop(x, y) && !overZero(x, y) && minusRegroupings(x, y).length >= 1);
  });

  it('Stufe 3: the regrouping crosses a 0: at the Zehner, then from a full number and from 1000, then the task to a result', () => {
    for (const [a, b, key] of pairs(3, 1)) {
      expect(overZero(a, b), key).toBe(true);
      expect(digitAt(a, 1), key).toBe(0);
      expect(digitAt(a, 0), key).toBeGreaterThan(0);
    }
    let thousand = 0;
    for (const [a, b, key] of pairs(3, 2)) {
      expect(overZero(a, b), key).toBe(true);
      expect(a % 100, key).toBe(0);
      if (a === 1000) thousand++;
    }
    expect(thousand).toBeGreaterThan(0);
    for (const ex of at(nullSkill, 3, 3)) expectPasst(ex, (x, y) => overZero(x, y));
  });

  it('Abziehen: a leading 0 in the result comes with the true calculation of its column', () => {
    expect(columnSteps('sub', [735, 710], 'abziehen')[2]).toBe('Hunderter: 7 − 7 = 0. Keine 0 vorne.');
    expect(columnSteps('sub', [134, 130], 'abziehen').slice(1)).toEqual(['Zehner: 3 − 3 = 0. Keine 0 vorne.', 'Hunderter: 1 − 1 = 0. Keine 0 vorne.']);
    expect(columnSteps('sub', [503, 445], 'abziehen')[2]).toBe('Hunderter: Oben ist jetzt 4. 4 − 4 = 0. Keine 0 vorne.');
    expect(columnSteps('sub', [303, 299], 'abziehen').slice(1)).toEqual(['Zehner: Oben ist jetzt 9. 9 − 9 = 0. Keine 0 vorne.', 'Hunderter: Oben ist jetzt 2. 2 − 2 = 0. Keine 0 vorne.']);
    // here the top digit really is 0 now
    expect(columnSteps('sub', [132, 45], 'abziehen')[2]).toBe('Hunderter: Oben ist jetzt 0. Keine 0 vorne.');
  });

  it('Abziehen: "Oben ist jetzt" always names the digit that stands on top, for every small task', () => {
    for (let a = 100; a <= 1000; a += 7) {
      for (let b = 1; b < a; b += 11) {
        const tops = topsWhenReached(a, b);
        columnSteps('sub', [a, b], 'abziehen').forEach((line, p) => {
          const said = /Oben ist jetzt (\d)/.exec(line);
          if (said) expect(Number(said[1]), `${a} − ${b}: ${line}`).toBe(tops[p]);
          const calc = /(\d+) − (\d+) = 0\. Keine 0 vorne/.exec(line);
          if (calc) expect([Number(calc[1]), Number(calc[2])], `${a} − ${b}: ${line}`).toEqual([tops[p], tops[p]]);
        });
      }
    }
  });

  it('Stufe 3: the result keeps at least 3 digits, as in the other minus skills', () => {
    for (const ab of [1, 2] as const) for (const [a, b, key] of pairs(3, ab)) expect(a - b, key).toBeGreaterThanOrEqual(100);
  });

  it('Stufe 3: each method has its own prompt', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of at(nullSkill, 3, ab, 'abziehen')) expect(ex.prompt, ex.key).toBe('Rechne schriftlich. Geh Schritt für Schritt über die 0.');
      for (const ex of at(nullSkill, 3, ab, 'ergaenzen')) expect(ex.prompt, ex.key).toBe('Rechne schriftlich. Denk bei der 0 an den Übertrag.');
    }
  });

  it('offers the bug hint of the method set', () => {
    for (const method of METHODS) {
      for (const ab of [1, 2] as const) {
        for (const ex of at(nullSkill, 3, ab, method)) expect(ex.bugs?.some((b) => b.id === 'ueber-die-null'), ex.key).toBe(true);
      }
    }
  });
});
