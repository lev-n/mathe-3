import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { subtrahierenSkill } from './subtrahieren';
import { METHODS, at, expectPasst, expectProbe, formOf, formsOf, minusRegroupings, sharedChecks, writtenOf } from './test-helpers';

describeSkill(subtrahierenSkill);

const len = (n: number) => String(n).length;
const zeroFree = (...ns: number[]) => !ns.join('').includes('0');

describe('schriftlich.subtrahieren: the Lücke speaks the method', () => {
  it('Ergänzen: the column reads "Von … bis …"', () => {
    let seen = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of at(subtrahierenSkill, 3, ab, 'ergaenzen')) {
        if (!ex.key.includes(':luecke:')) continue;
        seen++;
        expect(ex.hints[1], ex.key).toMatch(/^Rechne in dieser Spalte: Von \S+ bis \S+ (fehlt|fehlen) \S+\.$/);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('schriftlich.subtrahieren', () => {
  sharedChecks(subtrahierenSkill);

  it('follows the method; no form of a written minus needs a Übertrag', () => {
    expect(subtrahierenSkill.usesMethod).toBe(true);
    for (const method of METHODS) {
      for (const stufe of [1, 2] as const) {
        for (const ab of [1, 2] as const) {
          for (const ex of at(subtrahierenSkill, stufe, ab, method)) {
            const { method: set, operands: [a, b], result } = writtenOf(ex);
            expect(set, ex.key).toBe(method);
            expect(minusRegroupings(a, b), ex.key).toEqual([]);
            expect(result, ex.key).toBe(a - b);
          }
        }
      }
    }
  });

  it('Stufe 1: 3 digits, none of them 0; then equal digits in a column; then the task to a result', () => {
    for (const ex of at(subtrahierenSkill, 1, 1)) {
      const { operands: [a, b] } = writtenOf(ex);
      expect([len(a), len(b)], ex.key).toEqual([3, 3]);
      expect(zeroFree(a, b), ex.key).toBe(true);
      expect(zeroFree(a - b), ex.key).toBe(true);
    }
    for (const ex of at(subtrahierenSkill, 1, 2)) {
      const { operands: [a, b] } = writtenOf(ex);
      expect([len(a), len(b)], ex.key).toEqual([3, 3]);
      expect(zeroFree(a, b), ex.key).toBe(true);
      expect([1, 10].some((p) => Math.floor(a / p) % 10 === Math.floor(b / p) % 10), ex.key).toBe(true);
    }
    for (const ex of at(subtrahierenSkill, 1, 3)) expectPasst(ex, (x, y) => len(x) === 3 && len(y) === 3 && zeroFree(x, y) && minusRegroupings(x, y).length === 0);
  });

  it('Stufe 2: a short number, then a 0 below, then the task to a result', () => {
    for (const ex of at(subtrahierenSkill, 2, 1)) expect(len(writtenOf(ex).operands[1]), ex.key).toBe(2);
    for (const ex of at(subtrahierenSkill, 2, 2)) expect(String(writtenOf(ex).operands[1]), ex.key).toContain('0');
    for (const ex of at(subtrahierenSkill, 2, 3)) expectPasst(ex, (x, y) => (len(y) < 3 || String(y).includes('0')) && minusRegroupings(x, y).length === 0);
  });

  it('Stufe 3, AB 1: calculate, then check with plus; the task shows no result to copy, in both methods', () => {
    for (const method of METHODS) {
      expect(formsOf(at(subtrahierenSkill, 3, 1, method))).toEqual(['probe']);
      for (const ex of at(subtrahierenSkill, 3, 1, method)) {
        expectProbe(ex, 'sub', method);
        const [a, b] = (ex.expression as string).split(' − ').map(Number);
        expect(minusRegroupings(a, b), ex.key).toEqual([]);
      }
    }
  });

  it('Stufe 3, AB 2: a box in the result or the lower number; AB 3: in the upper number, or the whole upper number', () => {
    for (const method of METHODS) {
      for (const ex of at(subtrahierenSkill, 3, 2, method)) {
        expect(formOf(ex), ex.key).toBe('luecke');
        const v = ex.visual as VisualOf<'written'>;
        const [mask] = v.masks ?? [];
        expect(v.method, ex.key).toBe(method);
        expect(mask.row === 'result' || mask.index === 1, ex.key).toBe(true);
        expect(v.operands[0] - v.operands[1], ex.key).toBe(v.shownResult);
      }
      expect(formsOf(at(subtrahierenSkill, 3, 3, method))).toEqual(['luecke', 'oben']);
      for (const ex of at(subtrahierenSkill, 3, 3, method)) {
        if (ex.answer.kind !== 'number') throw new Error(ex.key);
        if (formOf(ex) === 'luecke') {
          const v = ex.visual as VisualOf<'written'>;
          const [mask] = v.masks ?? [];
          expect([mask.row, mask.index], ex.key).toEqual(['operand', 0]);
          expect(ex.answer.value, ex.key).toBe(Math.floor(v.operands[0] / 10 ** mask.place) % 10);
        } else {
          const [, b, c] = /□ − (\d+) = (\d+)/.exec(ex.expression as string) as RegExpExecArray;
          expect(ex.answer.value, ex.key).toBe(Number(b) + Number(c));
          expect(minusRegroupings(ex.answer.value as number, Number(b)), ex.key).toEqual([]);
        }
      }
    }
  });
});
