import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { subtrahierenUebertragSkill } from './subtrahieren-uebertrag';
import { METHODS, at, detektivItems, expectOneTrueOption, expectPasst, expectSpalte, formOf, formsOf, minusRegroupings, rightOption, sharedChecks, writtenOf } from './test-helpers';

describeSkill(subtrahierenUebertragSkill);

const zeroFree = (...ns: number[]) => !ns.join('').includes('0');

describe('schriftlich.subtrahieren-uebertrag', () => {
  sharedChecks(subtrahierenUebertragSkill);

  it('Stufe 1, AB 1 and 2: one regrouping without zeros, at the Einer and then at the Zehner', () => {
    for (const method of METHODS) {
      for (const [ab, place] of [[1, 0], [2, 1]] as const) {
        for (const ex of at(subtrahierenUebertragSkill, 1, ab, method)) {
          const { operands: [a, b], result } = writtenOf(ex);
          expect(minusRegroupings(a, b), ex.key).toEqual([place]);
          expect(zeroFree(a, b), ex.key).toBe(true);
          expect(result, ex.key).toBe(a - b);
        }
      }
    }
  });

  it('Stufe 1, AB 3: the task to a result, or the column with too little on top; always one regrouping', () => {
    for (const method of METHODS) {
      const items = at(subtrahierenUebertragSkill, 1, 3, method);
      expect(formsOf(items)).toEqual(['passt', 'spalte']);
      for (const ex of items) {
        if (formOf(ex) === 'passt') expectPasst(ex, (x, y) => minusRegroupings(x, y).length === 1 && zeroFree(x, y));
        else expectSpalte(ex, ([a, b]) => minusRegroupings(a, b));
      }
    }
  });

  it('Stufe 2: 2 regroupings, then with a short number, then the task to a result', () => {
    for (const ex of at(subtrahierenUebertragSkill, 2, 1)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect(minusRegroupings(a, b), ex.key).toEqual([0, 1]);
      expect(result, ex.key).toBe(a - b);
    }
    for (const ex of at(subtrahierenUebertragSkill, 2, 2)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect(b, ex.key).toBeLessThan(100);
      expect(minusRegroupings(a, b), ex.key).toEqual([0, 1]);
      expect(result, ex.key).toBe(a - b);
    }
    for (const ex of at(subtrahierenUebertragSkill, 2, 3)) expectPasst(ex, (x, y) => minusRegroupings(x, y).length === 2);
  });

  it('Stufe 3, AB 1: the fitting sentence is true for the Zehner, after the Einer have changed them, in the method set', () => {
    for (const method of METHODS) {
      expect(formsOf(at(subtrahierenUebertragSkill, 3, 1, method))).toEqual(['satz']);
      for (const ex of at(subtrahierenUebertragSkill, 3, 1, method)) {
        const v = ex.visual as VisualOf<'written'>;
        expect(v.method, ex.key).toBe(method);
        const [a, b] = v.operands;
        expect(minusRegroupings(a, b), ex.key).toEqual([0, 1]);
        expect(ex.prompt, ex.key).toMatch(/zu den Zehnern/);
        const top = Math.floor(a / 10) % 10;
        const low = Math.floor(b / 10) % 10;
        // worked by hand: Abziehen takes 1 from the top digit, Ergänzen adds 1 to the bottom digit
        const r = top - 1 + 10 - low;
        expect(rightOption(ex), ex.key).toContain(method === 'abziehen' ? `Oben ist jetzt ${top - 1}. Wechsle 1 Hunderter: ${top + 9} − ${low} = ${r}.` : `${low} + 1 = ${low + 1}. Von ${low + 1} bis ${top + 10} ${r === 1 ? 'fehlt' : 'fehlen'} ${r}.`);
        if (ex.answer.kind !== 'choice') throw new Error(ex.key);
        expect(ex.answer.options.length, ex.key).toBe(4);
        for (const o of ex.answer.options) expect(o.label, ex.key).not.toMatch(/\b(einer|einern)\b/i);
      }
    }
  });

  it('Stufe 3, AB 2: find the place or calculate again; AB 3: name the mistake. A planted result is never the right one', () => {
    for (const method of METHODS) {
      expect(formsOf(at(subtrahierenUebertragSkill, 3, 2, method))).toEqual(['det-neu', 'det-wo']);
      expect(formsOf(at(subtrahierenUebertragSkill, 3, 3, method))).toEqual(['det-warum']);
      for (const ex of [...at(subtrahierenUebertragSkill, 3, 2, method), ...at(subtrahierenUebertragSkill, 3, 3, method)]) {
        const v = ex.visual as VisualOf<'written'>;
        expect(v.method, ex.key).toBe(method);
        expect(v.shownResult, ex.key).not.toBe(v.operands[0] - v.operands[1]);
      }
    }
  });

  it('"Was stimmt nicht?" has one true option, also where the lower number is shorter', () => {
    for (const method of METHODS) {
      const items = detektivItems(subtrahierenUebertragSkill, method, 'det-warum');
      expect(items.some((ex) => ex.key.includes(':stellenzahl:')), method).toBe(true);
      for (const ex of items) {
        const v = ex.visual as VisualOf<'written'>;
        expectOneTrueOption(ex, 'sub', v.operands, method, v.shownResult as number);
      }
    }
  });

  it('every wrong result on screen comes from the bug library of the method', () => {
    for (const ex of at(subtrahierenUebertragSkill, 3, 2, 'ergaenzen')) {
      if (formOf(ex) === 'det-neu') expect(ex.bugs?.length, ex.key).toBeGreaterThan(0);
    }
  });
});
