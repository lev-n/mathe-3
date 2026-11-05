import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { correctResult } from '../../core/written';
import { addierenUebertragSkill } from './addieren-uebertrag';
import { at, detektivItems, expectOneTrueOption, expectPasst, expectSpalte, formOf, formsOf, plusCarries, rightOption, sharedChecks, writtenOf } from './test-helpers';

describeSkill(addierenUebertragSkill);

const value = (label: string) => label.split(' + ').reduce((s, n) => s + Number(n), 0);
const len = (n: number) => String(n).length;

describe('schriftlich.addieren-uebertrag', () => {
  sharedChecks(addierenUebertragSkill);

  it('Stufe 1: no 0 in the numbers: a column with a 0 is the content of Stufe 2 (508 + 406)', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of at(addierenUebertragSkill, 1, ab, 'abziehen', 400)) {
        if (ex.answer.kind === 'written') expect(ex.answer.operands.join(''), ex.key).not.toContain('0');
        if (ex.visual?.type === 'written') expect(ex.visual.operands.join(''), ex.key).not.toContain('0');
        if (formOf(ex) === 'passt' && ex.answer.kind === 'choice') for (const o of ex.answer.options) expect(o.label, ex.key).not.toContain('0');
      }
    }
  });

  it('Stufe 1, AB 1 and 2: one Übertrag, at the Einer and then at the Zehner, result up to 999', () => {
    for (const [ab, place] of [[1, 0], [2, 1]] as const) {
      for (const ex of at(addierenUebertragSkill, 1, ab)) {
        const { operands: [a, b], result } = writtenOf(ex);
        expect(plusCarries([a, b]), ex.key).toEqual([place]);
        expect(len(a), ex.key).toBe(len(b));
        expect(result, ex.key).toBe(a + b);
        expect(result, ex.key).toBeLessThanOrEqual(999);
      }
    }
  });

  it('Stufe 1, AB 3: the task to a result, or the column with the Übertrag; always one Übertrag', () => {
    const items = at(addierenUebertragSkill, 1, 3);
    expect(formsOf(items)).toEqual(['passt', 'spalte']);
    for (const ex of items) {
      if (formOf(ex) === 'passt') expectPasst(ex, (x, y) => plusCarries([x, y]).length === 1 && x + y <= 999);
      else expectSpalte(ex, plusCarries);
    }
  });

  it('Stufe 2, AB 1: 2 Überträge, result up to 999', () => {
    for (const ex of at(addierenUebertragSkill, 2, 1)) {
      const { operands, result } = writtenOf(ex);
      expect(plusCarries(operands).length, ex.key).toBe(2);
      expect(result, ex.key).toBeLessThanOrEqual(999);
    }
  });

  it('Stufe 2, AB 2: a Übertrag to the 0, the sum 1000 or a short number with 2 Überträge', () => {
    let thousand = 0;
    let toZero = 0;
    let short = 0;
    for (const ex of at(addierenUebertragSkill, 2, 2)) {
      const { operands: [a, b], result } = writtenOf(ex);
      expect(result, ex.key).toBe(a + b);
      expect(result, ex.key).toBeLessThanOrEqual(1000);
      if (result === 1000) thousand++;
      else if (len(b) === 2) {
        short++;
        expect(plusCarries([a, b]).length, ex.key).toBe(2);
      } else {
        toZero++;
        expect(ex.bugs?.some((bug) => bug.id === 'uebertrag-zur-null'), ex.key).toBe(true);
      }
    }
    expect(thousand).toBeGreaterThan(0);
    expect(toZero).toBeGreaterThan(0);
    expect(short).toBeGreaterThan(0);
  });

  it('Stufe 2, AB 3: the task to a result, up to 1000', () => {
    expect(formsOf(at(addierenUebertragSkill, 2, 3))).toEqual(['passt']);
    for (const ex of at(addierenUebertragSkill, 2, 3)) expectPasst(ex, (x, y) => x + y <= 1000 && plusCarries([x, y]).length >= 1);
  });

  it('Stufe 3: three numbers, then Ziffernkarten or 2 Überträge, then the Fehlerdetektiv', () => {
    for (const ex of at(addierenUebertragSkill, 3, 1)) {
      const { operands, result } = writtenOf(ex);
      expect(operands.length, ex.key).toBe(3);
      expect(result, ex.key).toBe(operands[0] + operands[1] + operands[2]);
      expect(plusCarries(operands).length, ex.key).toBeGreaterThanOrEqual(1);
      expect(result, ex.key).toBeLessThanOrEqual(1000);
    }
    expect(formsOf(at(addierenUebertragSkill, 3, 2))).toEqual(['karten', 'rechnen']);
    for (const ex of at(addierenUebertragSkill, 3, 2)) {
      if (formOf(ex) === 'rechnen') {
        expect(writtenOf(ex).operands.length, ex.key).toBe(3);
        expect(plusCarries(writtenOf(ex).operands).length, ex.key).toBeGreaterThanOrEqual(2);
      } else if (ex.answer.kind === 'choice') {
        const labels = ex.answer.options.map((o) => o.label);
        const best = value(rightOption(ex));
        labels.filter((l) => l !== rightOption(ex)).forEach((l) => expect(value(l), ex.key).toBeLessThan(best));
      }
    }
    for (const ex of at(addierenUebertragSkill, 3, 3)) {
      expect(formOf(ex), ex.key).toMatch(/^det-/);
      const v = ex.visual as VisualOf<'written'>;
      expect(v.shownResult, ex.key).not.toBe(correctResult('add', v.operands));
    }
  });

  it('"Was stimmt nicht?" has one true option', () => {
    const items = detektivItems(addierenUebertragSkill, 'abziehen', 'det-warum');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const v = ex.visual as VisualOf<'written'>;
      expectOneTrueOption(ex, 'add', v.operands, 'abziehen', v.shownResult as number);
    }
  });
});
