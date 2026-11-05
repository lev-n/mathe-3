import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { multiplizierenSkill } from './multiplizieren';
import { at, detektivItems, expectOneTrueOption, expectPasst, expectSpalte, formOf, formsOf, malCarries, sharedChecks, writtenOf } from './test-helpers';

describeSkill(multiplizierenSkill);

/** Each digit times the second factor, on its own. */
const digitsTimes = (a: number, m: number) => String(a).split('').map((d) => Number(d) * m);

/** 214 · □ = 642: the answer is the missing factor, and the task stays inside the Stufe. */
function expectGap(ex: Exercise, inScope: (a: number, m: number) => boolean): void {
  if (ex.answer.kind !== 'number') throw new Error(ex.key);
  const [, a, product] = /^(\d+) · □ = (\d+)$/.exec(ex.expression as string) as RegExpExecArray;
  const m = ex.answer.value as number;
  expect(Number(a) * m, ex.key).toBe(Number(product));
  expect(inScope(Number(a), m), ex.key).toBe(true);
}

describe('schriftlich.multiplizieren', () => {
  sharedChecks(multiplizierenSkill);

  it('is an optional skill', () => {
    expect(multiplizierenSkill.optional).toBe('extra');
    expect(multiplizierenSkill.usesMethod).toBeUndefined();
  });

  it('Stufe 1: 2 digits, no Übertrag: mal 2, then mal 3 or 4; AB 2 asks more than AB 1 and has no 10 · 9 or 11 · 7', () => {
    const tasks = new Set<string>();
    for (const ex of at(multiplizierenSkill, 1, 2, 'abziehen', 400)) {
      const { operands: [a, m] } = writtenOf(ex);
      expect(a, ex.key).toBeGreaterThanOrEqual(12);
      tasks.add(`${a}|${m}`);
    }
    expect(tasks.size).toBeGreaterThanOrEqual(12);
    for (const [ab, low, high] of [[1, 2, 2], [2, 3, 4]] as const) {
      for (const ex of at(multiplizierenSkill, 1, ab)) {
        const { operands: [a, m], result } = writtenOf(ex);
        expect(a, ex.key).toBeGreaterThanOrEqual(10);
        expect(a, ex.key).toBeLessThan(100);
        expect(m, ex.key).toBeGreaterThanOrEqual(low);
        expect(m, ex.key).toBeLessThanOrEqual(high);
        expect(digitsTimes(a, m).every((v) => v < 10), ex.key).toBe(true);
        expect(result, ex.key).toBe(a * m);
      }
    }
  });

  it('Stufe 1, AB 3: the task to a result, or the missing second factor; still 2 digits and no Übertrag', () => {
    const items = at(multiplizierenSkill, 1, 3);
    expect(formsOf(items)).toEqual(['luecke', 'passt']);
    for (const ex of items) {
      if (formOf(ex) === 'passt') expectPasst(ex, (a, m) => a < 100 && digitsTimes(a, m).every((v) => v < 10));
      else expectGap(ex, (a, m) => a < 100 && digitsTimes(a, m).every((v) => v < 10));
    }
  });

  it('Stufe 2: 3 digits, one Übertrag: at the Einer, then at the Zehner', () => {
    for (const [ab, place] of [[1, 0], [2, 1]] as const) {
      for (const ex of at(multiplizierenSkill, 2, ab)) {
        const { operands: [a, m], result } = writtenOf(ex);
        expect(a, ex.key).toBeGreaterThanOrEqual(100);
        expect(malCarries(a, m), ex.key).toEqual([place]);
        expect(result, ex.key).toBe(a * m);
        expect(result, ex.key).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('Stufe 2, AB 3: the column with the Übertrag, or the missing second factor; still one Übertrag', () => {
    const items = at(multiplizierenSkill, 2, 3);
    expect(formsOf(items)).toEqual(['luecke', 'spalte']);
    for (const ex of items) {
      if (formOf(ex) === 'spalte') expectSpalte(ex, ([a, m]) => malCarries(a, m));
      else expectGap(ex, (a, m) => a >= 100 && malCarries(a, m).length === 1);
    }
  });

  it('Stufe 3, AB 1: 2 Überträge, product up to 1000', () => {
    for (const ex of at(multiplizierenSkill, 3, 1)) {
      const { operands: [a, m], result } = writtenOf(ex);
      expect(malCarries(a, m), ex.key).toEqual([0, 1]);
      expect(result, ex.key).toBe(a * m);
      expect(result, ex.key).toBeLessThanOrEqual(1000);
    }
  });

  it('every number is at most 3 digits times 1 digit (Sachsen)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of at(multiplizierenSkill, stufe, ab)) {
          if (ex.answer.kind !== 'written') continue;
          expect(ex.answer.operands[0], ex.key).toBeLessThanOrEqual(999);
          expect(ex.answer.operands[1], ex.key).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it('the missing second factor: no hint states it, also where a column ends with it (1 · 4, 6 · 4)', () => {
    let seen = 0;
    for (const stufe of [1, 2] as const) {
      for (const ex of at(multiplizierenSkill, stufe, 3, 'abziehen', 500)) {
        if (formOf(ex) !== 'luecke' || ex.answer.kind !== 'number') continue;
        seen++;
        expect(ex.hints[0], ex.key).not.toMatch(new RegExp(`endet mit ${ex.answer.value}\\.`));
      }
    }
    expect(seen).toBeGreaterThan(200);
  });

  it('which column: a wrong option says what its column really gives, also at the front (250 · 4)', () => {
    let front = 0;
    for (const ex of at(multiplizierenSkill, 2, 3, 'abziehen', 1500)) {
      if (formOf(ex) !== 'spalte' || ex.answer.kind !== 'choice' || ex.visual?.type !== 'written') continue;
      const [a, m] = ex.visual.operands;
      // worked by hand, from the Einer: each column with the Übertrag that reaches it
      const columns: number[] = [];
      let carry = 0;
      for (let p = 0; p < 3; p++) {
        const v = (Math.floor(a / 10 ** p) % 10) * m + carry;
        columns.push(v);
        carry = Math.floor(v / 10);
      }
      if (columns[2] >= 10) front++;
      for (const o of ex.answer.options) {
        const p = ['Bei den Einern', 'Bei den Zehnern', 'Bei den Hundertern'].indexOf(o.label);
        if (o.whyWrong?.includes('weniger als 10')) expect(columns[p], `${ex.key}: ${o.label}`).toBeLessThan(10);
      }
    }
    expect(front).toBeGreaterThan(0);
  });

  it('"Was stimmt nicht?" has one true option', () => {
    const items = detektivItems(multiplizierenSkill, 'abziehen', 'det-warum');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const v = ex.visual as VisualOf<'written'>;
      expectOneTrueOption(ex, 'mul', v.operands, 'abziehen', v.shownResult as number);
    }
  });

  it('Stufe 3, AB 2: find the place or calculate again; AB 3: name the mistake. A planted result is never the right one', () => {
    expect(formsOf(at(multiplizierenSkill, 3, 2))).toEqual(['det-neu', 'det-wo']);
    expect(formsOf(at(multiplizierenSkill, 3, 3))).toEqual(['det-warum']);
    for (const ex of [...at(multiplizierenSkill, 3, 2), ...at(multiplizierenSkill, 3, 3)]) {
      const v = ex.visual as VisualOf<'written'>;
      expect(v.shownResult, ex.key).not.toBe(v.operands[0] * v.operands[1]);
      expect(v.operands[0], ex.key).toBeGreaterThanOrEqual(100);
    }
  });
});
