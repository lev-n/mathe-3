import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { addierenSkill } from './addieren';
import { at, expectPasst, formsOf, plusCarries, sharedChecks, writtenOf } from './test-helpers';

describeSkill(addierenSkill);

const len = (n: number) => String(n).length;
const zeroInColumn = (a: number, b: number) => [10, 1].some((p) => (Math.floor(a / p) % 10 === 0) !== (Math.floor(b / p) % 10 === 0));
const zeroFree = (...ns: number[]) => !ns.join('').includes('0');

describe('schriftlich.addieren', () => {
  sharedChecks(addierenSkill);

  it('never needs a Übertrag', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of at(addierenSkill, stufe, ab)) {
          if (ex.answer.kind === 'written') expect(plusCarries(ex.answer.operands), ex.key).toEqual([]);
          const v = ex.visual as VisualOf<'written'> | undefined;
          if (v?.type === 'written') expect(plusCarries(v.operands), ex.key).toEqual([]);
        }
      }
    }
  });

  it('Stufe 1: two numbers of the same length, no 0; 2 digits, then 3 digits, then the task to a result', () => {
    for (const ex of at(addierenSkill, 1, 1)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect([len(a), len(b)], ex.key).toEqual([2, 2]);
      expect(zeroFree(a, b), ex.key).toBe(true);
      expect(result, ex.key).toBe(a + b);
    }
    for (const ex of at(addierenSkill, 1, 2)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect([len(a), len(b)], ex.key).toEqual([3, 3]);
      expect(zeroFree(a, b), ex.key).toBe(true);
      expect(result, ex.key).toBe(a + b);
    }
    for (const ex of at(addierenSkill, 1, 3)) expectPasst(ex, (x, y) => len(x) === 3 && len(y) === 3 && zeroFree(x, y) && plusCarries([x, y]).length === 0);
  });

  it('Stufe 2: a long and a short number, then a 0 in a column, then the task to a result', () => {
    for (const ex of at(addierenSkill, 2, 1)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect([len(a), len(b)], ex.key).toEqual([3, 2]);
      expect(result, ex.key).toBe(a + b);
    }
    for (const ex of at(addierenSkill, 2, 2)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect(zeroInColumn(a, b), ex.key).toBe(true);
      expect(result, ex.key).toBe(a + b);
    }
    for (const ex of at(addierenSkill, 2, 3)) expectPasst(ex, (x, y) => (len(x) !== len(y) || zeroInColumn(x, y)) && plusCarries([x, y]).length === 0);
  });

  /** The digit in the box is the digit of the calculation on screen, and the calculation is true. */
  const expectBox = (ex: ReturnType<typeof at>[number], numbers: number) => {
    if (ex.answer.kind !== 'number') throw new Error(ex.key);
    const v = ex.visual as VisualOf<'written'>;
    const [mask] = v.masks ?? [];
    const digit = (n: number) => Math.floor(n / 10 ** mask.place) % 10;
    const shown = mask.row === 'result' ? (v.shownResult as number) : v.operands[mask.index ?? 0];
    expect(v.operands.length, ex.key).toBe(numbers);
    expect(ex.answer.value, ex.key).toBe(digit(shown));
    expect(v.operands.reduce((s, n) => s + n, 0), ex.key).toBe(v.shownResult);
  };

  it('Stufe 3: three numbers, then a box in two numbers, then a box in a number of three', () => {
    for (const ex of at(addierenSkill, 3, 1)) {
      const { operands, result } = writtenOf(ex);
      expect(operands.length, ex.key).toBe(3);
      expect(result, ex.key).toBe(operands[0] + operands[1] + operands[2]);
    }
    expect(formsOf(at(addierenSkill, 3, 2))).toEqual(['luecke']);
    for (const ex of at(addierenSkill, 3, 2)) expectBox(ex, 2);
    expect(formsOf(at(addierenSkill, 3, 3))).toEqual(['luecke']);
    for (const ex of at(addierenSkill, 3, 3)) {
      expectBox(ex, 3);
      expect((ex.visual as VisualOf<'written'>).masks?.[0].row, ex.key).toBe('operand');
    }
  });

  it('the spoken box names all numbers of the calculation', () => {
    const [ex] = at(addierenSkill, 3, 3);
    expect(ex.srText.split(' plus ').length).toBe(3);
  });
});
