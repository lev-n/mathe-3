import { describe, expect, it } from 'vitest';
import { checkAnswer, correctResponse, formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { samples } from '../test-utils';
import { teilenRestSkill } from './teilen-rest';
import { formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(teilenRestSkill);

const numbers = (ex: Exercise) => {
  const m = /(\d+) : (\d+) = □ Rest □/.exec(ex.expression ?? '');
  return m ? { p: Number(m[1]), d: Number(m[2]) } : null;
};

describe('kopfrechnen.teilen-rest', () => {
  itRecomputes(teilenRestSkill);
  itStaysReadable(teilenRestSkill);

  it('Ergebnis and Rest recompute, and the Rest is smaller than the divisor', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(teilenRestSkill, stufe)) {
        const t = numbers(ex);
        if (!t || ex.answer.kind !== 'multi') continue;
        const [q, r] = ex.answer.fields.map((f) => f.value);
        expect(q, ex.key).toBe(Math.floor(t.p / t.d));
        expect(r, ex.key).toBe(t.p % t.d);
        expect(r, ex.key).toBeLessThan(t.d);
      }
    }
  });

  it('keeps the ranges of the catalogue', () => {
    for (const ex of samples(teilenRestSkill, 1)) {
      const t = numbers(ex);
      if (!t) continue;
      expect(t.p, ex.key).toBeLessThanOrEqual(50);
      expect(t.d, ex.key).toBeLessThanOrEqual(5);
      expect(ex.visual?.type, `${ex.key}: Stufe 1 has a picture`).toBe('dotArray');
    }
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(teilenRestSkill, stufe)) {
        const t = numbers(ex);
        if (!t) continue;
        expect(t.p, ex.key).toBeLessThanOrEqual(90);
        expect(t.d, ex.key).toBeLessThanOrEqual(9);
      }
    }
  });

  it('writes Rest out, in two fields, with a Probe line', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(teilenRestSkill, stufe)) {
        expect(ex.steps.some((s) => /\d+ · \d+ \+ \d+ = \d+/.test(typeof s === 'string' ? s : s.text)), ex.key).toBe(true);
        expect(ex.expression ?? '', ex.key).not.toMatch(/\dR\d|\d R \d/);
      }
    }
  });

  it('Stufe 3 finds the Rest first, works the Probe and finds the number', () => {
    const forms = new Set(samples(teilenRestSkill, 3).map(formOf));
    for (const f of ['nur-rest', 'probe', 'zahl']) expect(forms).toContain(f);
  });

  it('the Probe ends on the two numbers that are equal: its sum and the number of the task', () => {
    const items = samples(teilenRestSkill, 3, 1000).filter((e) => formOf(e) === 'probe');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const [, p, d, q, r] = (/^(\d+) : (\d+) = (\d+) Rest (\d+)$/.exec(ex.expression ?? '') as RegExpExecArray).map(Number);
      expect(ex.steps[ex.steps.length - 1], ex.key).toBe(`${q * d} + ${r} = ${p}. Das ist die Zahl aus der Aufgabe: Die Probe stimmt.`);
    }
  });

  it('a story has a clean answer row', () => {
    const items = samples(teilenRestSkill, 1, 1000).filter((e) => formOf(e) === 'story');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) expect(formatAnswer(ex.answer), ex.key).toMatch(/^Jedes Kind bekommt \d+ Stifte, Stifte übrig: \d+$/);
  });

  it('a correct answer is accepted, also with Rest 0', () => {
    const zero = samples(teilenRestSkill, 2, 2000).find((e) => e.answer.kind === 'multi' && e.answer.fields.some((f) => f.id === 'r' && f.value === 0));
    if (!zero) throw new Error('no task with Rest 0');
    expect(checkAnswer(zero.answer, correctResponse(zero.answer), zero.bugs).correct).toBe(true);
  });

  it('its hints read the same with and without a Rest', () => {
    const shape = (ex: Exercise) => ex.hints.map((h) => h.replace(/\d+/g, '#')).join(' | ');
    const items = samples(teilenRestSkill, 2, 3000).filter((e) => formOf(e) === 'rest' && e.answer.kind === 'multi');
    const rest = (ex: Exercise) => (ex.answer.kind === 'multi' ? ex.answer.fields.find((f) => f.id === 'r')?.value : undefined);
    const withRest = new Set(items.filter((e) => rest(e) !== 0).map(shape));
    const without = new Set(items.filter((e) => rest(e) === 0).map(shape));
    expect(without.size).toBeGreaterThan(0);
    expect(withRest).toEqual(without);
    for (const ex of items) expect(ex.hints.join(' '), ex.key).not.toMatch(/nichts|schreib 0/i);
  });

  it('a division with and without its picture is one task', () => {
    for (const ex of samples(teilenRestSkill, 1, 1000).filter((e) => formOf(e) === 'rest')) expect(ex.key.split(':'), ex.key).toHaveLength(5);
  });

  it('computes the §5 bugs on the example of the catalogue: 17 : 5', () => {
    const ex = samples(teilenRestSkill, 1, 8000).find((e) => e.expression === '17 : 5 = □ Rest □');
    if (!ex) throw new Error('17 : 5');
    expect(ex.bugs?.find((b) => b.id === 'rest-zu-gross')?.match).toEqual({ q: 2, r: 7 });
    expect(ex.bugs?.find((b) => b.id === 'rest-zu-gross')?.hint).toBe('Der Rest muss kleiner als 5 sein.');
    expect(ex.bugs?.find((b) => b.id === 'rest-vergessen')?.match).toEqual({ q: 3, r: 0 });
    expect(ex.bugs?.find((b) => b.id === 'rest-vergessen')?.hint).toBe('Prüfe: 3 · 5 sind 15. Bis 17 fehlen noch 2.');
  });
});
