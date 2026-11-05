import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { inSchrittenSkill } from './in-schritten';
import { formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(inSchrittenSkill);

describe('kopfrechnen.in-schritten', () => {
  itRecomputes(inSchrittenSkill);
  itStaysReadable(inSchrittenSkill);

  it('the parts add up to the whole, in the fields of every Stufe', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(inSchrittenSkill, stufe)) {
        if (ex.answer.kind !== 'multi') continue;
        const parts = ex.answer.fields.slice(0, -1).map((f) => f.value);
        expect(parts.reduce((a, b) => a + b, 0), ex.key).toBe(ex.answer.fields.at(-1)?.value);
        const whole = /Rechne (\d+) (·|:) (\d+) in/.exec(ex.prompt) as RegExpExecArray;
        const expected = whole[2] === '·' ? Number(whole[1]) * Number(whole[3]) : Number(whole[1]) / Number(whole[3]);
        expect(ex.answer.fields.at(-1)?.value, ex.key).toBe(expected);
      }
    }
  });

  it('the Stufen have their forms', () => {
    expect(samples(inSchrittenSkill, 1).every((ex) => ex.key.includes(':mal'))).toBe(true);
    expect(samples(inSchrittenSkill, 2).every((ex) => ex.key.includes(':teilen'))).toBe(true);
    const forms = new Set(samples(inSchrittenSkill, 3).map(formOf));
    for (const f of ['nachbar', 'drei', 'drei-direkt']) expect(forms).toContain(f);
  });

  it('results stay within 1000', () => {
    for (const ex of samples(inSchrittenSkill, 3)) {
      const values = ex.answer.kind === 'number' ? [ex.answer.value as number] : ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : [];
      values.forEach((v) => expect(v, ex.key).toBeLessThanOrEqual(1000));
    }
  });

  it('computes zerlegen-einer of §5: 7 · 23 gives 143', () => {
    const hit = samples(inSchrittenSkill, 1, 8000).find((e) => e.expression === '7 · 23 = □');
    expect(hit?.bugs?.find((b) => b.id === 'zerlegen-einer')?.match).toBe(143);
    expect(hit?.bugs?.find((b) => b.id === 'zerlegen-einer')?.hint).toBe('Nimm auch die 3 mal: 7 · 20 und 7 · 3.');
  });
});
