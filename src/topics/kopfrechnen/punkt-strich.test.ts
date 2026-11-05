import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { evalSide } from '../step-check';
import { punktStrichSkill } from './punkt-strich';
import { formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(punktStrichSkill);

describe('kopfrechnen.punkt-strich', () => {
  itRecomputes(punktStrichSkill);
  itStaysReadable(punktStrichSkill);

  it('is an extra', () => {
    expect(punktStrichSkill.optional).toBe('extra');
  });

  it('Stufe 1 has no minus, Stufe 2 has minus with Mal', () => {
    for (const ex of samples(punktStrichSkill, 1)) expect(ex.expression, ex.key).not.toContain('−');
    expect(samples(punktStrichSkill, 2).some((ex) => ex.expression?.includes('−'))).toBe(true);
  });

  it('the right sign compares both sides, Mal first', () => {
    const items = samples(punktStrichSkill, 3).filter((e) => formOf(e) === 'vergleich');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [left, right] = (ex.expression as string).split(' □ ').map((s) => evalSide(s)?.value as number);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(left < right ? '<' : left > right ? '>' : '=');
      expect(ex.answer.layout).toBe('symbols');
    }
  });

  it('exactly one Rechnung has the asked result', () => {
    const items = samples(punktStrichSkill, 3).filter((e) => formOf(e) === 'wahl');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const v = Number(/Ergebnis (\d+)\?/.exec(ex.prompt)?.[1]);
      ex.answer.options.forEach((o, i) => expect(evalSide(o.label)?.value === v, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('computes §5 punkt-strich: 2 + 3 · 4 gives 20', () => {
    const ex = samples(punktStrichSkill, 1, 8000).find((e) => e.expression === '2 + 3 · 4 = □');
    expect(ex?.bugs?.find((b) => b.id === 'punkt-strich')?.match).toBe(20);
    expect(ex?.bugs?.find((b) => b.id === 'punkt-strich')?.hint).toBe('Mal kommt zuerst: Rechne erst 3 · 4.');
    const minus = samples(punktStrichSkill, 2, 8000).find((e) => e.expression === '20 − 3 · 4 = □');
    expect(minus?.answer).toMatchObject({ value: 8 });
  });
});
