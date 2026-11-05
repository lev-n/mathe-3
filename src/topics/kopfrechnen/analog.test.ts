import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import { CTX, samples } from '../test-utils';
import { analogSkill } from './analog';
import { bugMatch, formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(analogSkill);

describe('kopfrechnen.analog', () => {
  itRecomputes(analogSkill);
  itStaysReadable(analogSkill);

  it('Stufe 1 stays with plus and full hundreds or tens', () => {
    for (const ex of samples(analogSkill, 1)) {
      expect(ex.expression ?? ex.answer.kind).not.toContain('−');
      if (ex.answer.kind === 'number') expect((ex.answer.value as number) % 10).toBe(0);
    }
  });

  it('Stufe 2 also has minus, Stufe 3 has choice items and a Päckchen', () => {
    expect(samples(analogSkill, 2).some((ex) => ex.expression?.includes('−'))).toBe(true);
    const forms = new Set(samples(analogSkill, 3).map(formOf));
    for (const f of ['klein', 'gross', 'paeckchen']) expect(forms).toContain(f);
  });

  it('the right small task has the digits and the sign of the big one', () => {
    for (const ex of samples(analogSkill, 3).filter((e) => formOf(e) === 'klein')) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [, big1, sign, big2] = /zu (\d+) (\S) (\d+)\?/.exec(ex.prompt) as RegExpExecArray;
      expect(ex.answer.options[ex.answer.correct].label).toBe(`${Number(big1) / 10} ${sign} ${Number(big2) / 10}`);
    }
  });

  it('a Päckchen goes on by its own step', () => {
    for (const ex of samples(analogSkill, 3).filter((e) => formOf(e) === 'paeckchen')) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const results = [...(ex.expression as string).matchAll(/= (\d+)/g)].map((m) => Number(m[1]));
      const step = results[1] - results[0];
      expect(ex.answer.fields[0].value).toBe(results[1] + step);
      expect(ex.answer.fields[1].value).toBe(results[1] + 2 * step);
    }
  });

  it('writes the 1 as one, in the worked steps of a gap', () => {
    const text = (s: Exercise['steps'][number]) => (typeof s === 'string' ? s : s.text);
    const gaps = samples(analogSkill, 1, 3000).filter((e) => formOf(e) === 'luecke' && e.answer.kind === 'number');
    const ones = gaps.filter((e) => e.answer.kind === 'number' && (e.answer.value === 10 || e.answer.value === 100));
    expect(ones.length).toBeGreaterThan(0);
    for (const ex of ones) {
      expect(text(ex.steps[0]), ex.key).toContain('Es fehlt 1.');
      expect(text(ex.steps[1]), ex.key).toMatch(/^Das ist 1 (Zehner|Hunderter)\.$/);
    }
    const many = gaps.find((e) => e.answer.kind === 'number' && e.answer.value === 300);
    expect(many && text(many.steps[1])).toBe('Das sind 3 Hunderter.');
    const zweistellig = samples(analogSkill, 2, 2000).find((e) => formOf(e) === 'z-luecke' && e.answer.kind === 'number' && e.answer.value === 30);
    expect(zweistellig && text(zweistellig.steps[0])).toContain('Es fehlen 3.');
  });

  it('the fields of beide stay at 3 digits, with 1000 still asked as a plain number', () => {
    const items = samples(analogSkill, 1, 4000);
    const beide = items.filter((e) => formOf(e) === 'beide');
    expect(beide.length).toBeGreaterThan(0);
    for (const ex of beide) if (ex.answer.kind === 'multi') for (const f of ex.answer.fields) expect(f.value, ex.key).toBeLessThan(1000);
    expect(items.some((e) => formOf(e) === 'ohne' && e.answer.kind === 'number' && e.answer.value === 1000)).toBe(true);
  });

  it('sends a gap on the left backwards, and only a gap on the right from the start', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(analogSkill, stufe, 2000)) {
        if (!ex.expression?.startsWith('□')) continue;
        for (const t of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(t, ex.key).not.toContain('vom Anfang');
      }
    }
    const items = samples(analogSkill, 1, 4000);
    const left = items.find((e) => e.expression === '□ + 60 = 90');
    expect(left?.bugs?.find((b) => b.match === 150)?.hint).toContain('Umkehraufgabe');
    const right = items.find((e) => e.expression === '30 + □ = 90');
    expect(right?.bugs?.find((b) => b.match === 120)).toMatchObject({ id: 'summe-gerechnet', hint: expect.stringContaining('vom Anfang') });
  });

  it('names the place value bugs of §5 and the crossing of a hundred', () => {
    const crossing = samples(analogSkill, 2).find((e) => bugMatch(e, 'hunderter-uebergang').length > 0);
    expect(crossing).toBeDefined();
    const plain = analogSkill.generate(createRng(5), 1, { ...CTX, ab: 1 });
    expect(bugMatch(plain, 'klein-gerechnet')).toHaveLength(1);
  });

  it('the start of a minus task is found with the Umkehraufgabe, it does not lack anything', () => {
    const first = (ex: Exercise) => (typeof ex.steps[0] === 'string' ? ex.steps[0] : ex.steps[0].text);
    const gaps = samples(analogSkill, 2, 4000).filter((e) => formOf(e) === 'z-luecke');
    const front = gaps.filter((e) => /^□ − /.test(e.expression ?? ''));
    expect(front.length).toBeGreaterThan(0);
    for (const ex of front) {
      expect(first(ex), ex.key).not.toMatch(/fehl/);
      expect(first(ex), ex.key).toMatch(/Umkehraufgabe: \d+ \+ \d+ = \d+\.$/);
    }
    expect(gaps.some((e) => /^□ \+ /.test(e.expression ?? '') && /Es (fehlt|fehlen)/.test(first(e)))).toBe(true);
  });
});
