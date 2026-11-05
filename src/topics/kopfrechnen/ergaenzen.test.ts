import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { ergaenzenSkill, jedeZifferZu10, wegpunkte } from './ergaenzen';
import { strichSteps } from './helpers';
import { formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(ergaenzenSkill);

describe('kopfrechnen.ergaenzen', () => {
  itRecomputes(ergaenzenSkill);
  itStaysReadable(ergaenzenSkill);

  it('goes over full numbers', () => {
    expect(wegpunkte(233, 1000)).toEqual([233, 240, 300, 1000]);
    expect(wegpunkte(640, 1000)).toEqual([640, 700, 1000]);
    expect(wegpunkte(370, 400)).toEqual([370, 400]);
    expect(wegpunkte(700, 1000)).toEqual([700, 1000]);
  });

  it('computes §5 ergaenzen-1000', () => {
    expect(jedeZifferZu10(233, 1000)).toBe(877);
    expect(jedeZifferZu10(640, 1000)).toBe(460);
  });

  it('Stufe 1 goes to the next hundred, Stufe 2 and 3 to 1000', () => {
    for (const ex of samples(ergaenzenSkill, 1)) {
      const nums = [...(ex.expression ?? ex.prompt).matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect(Math.max(...nums) % 100, ex.key).toBe(0);
      expect(Math.max(...nums), ex.key).toBeLessThanOrEqual(900);
    }
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(ergaenzenSkill, stufe)) expect(`${ex.context ?? ''} ${ex.prompt} ${ex.expression ?? ''}`, ex.key).toContain('1000');
    }
  });

  it('Stufe 2 starts from full tens, Stufe 3 from any number, and also goes backwards', () => {
    for (const ex of samples(ergaenzenSkill, 2)) {
      if (ex.answer.kind === 'number') expect((ex.answer.value as number) % 10, ex.key).toBe(0);
    }
    const forms = new Set(samples(ergaenzenSkill, 3).map(formOf));
    expect(forms).toContain('rueck');
    expect(samples(ergaenzenSkill, 3).some((ex) => ex.answer.kind === 'number' && (ex.answer.value as number) % 10 !== 0)).toBe(true);
  });

  it('the ergaenzen-1000 hint says what is true for the known number', () => {
    const short = 'Bis zur 1000: Bei den Hundertern geht es bis 9.';
    const long = 'Bis zur 1000: Bei den Hundertern und Zehnern geht es bis 9.';
    const items = [...samples(ergaenzenSkill, 2, 2000), ...samples(ergaenzenSkill, 3, 2000)].filter((e) => e.bugs?.some((b) => b.id === 'ergaenzen-1000'));
    const hints = new Set<string>();
    for (const ex of items) {
      const hint = ex.bugs?.find((b) => b.id === 'ergaenzen-1000')?.hint as string;
      hints.add(hint);
      // In every form of the skill the known number is the first one in the text that is not 1000.
      const known = [...`${ex.context ?? ''} ${ex.expression ?? ex.prompt}`.matchAll(/\d+/g)].map((m) => Number(m[0])).find((x) => x !== 1000) as number;
      expect(hint, `${ex.key}: ${known}`).toBe(known % 10 === 0 ? short : long);
    }
    expect(hints).toEqual(new Set([short, long]));
  });

  it('□ + 604 = 1000 shows the way in its worked steps', () => {
    const items = samples(ergaenzenSkill, 3, 2000).filter((e) => formOf(e) === 'erste');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const m = Number(/□ \+ (\d+) = 1000/.exec(ex.expression as string)?.[1]);
      const jumps = ex.steps.map((s) => /^(\d+) − (\d+) = (\d+)$/.exec(typeof s === 'string' ? s : s.text)).filter((j) => j !== null);
      const parts = [m - (m % 100), (m % 100) - (m % 10), m % 10].filter((p) => p > 0);
      if (parts.length === 1) continue;
      expect(jumps.map((j) => Number(j[2])), ex.key).toEqual(parts);
      expect(Number(jumps[0][1]), ex.key).toBe(1000);
      expect(Number(jumps[jumps.length - 1][3]), ex.key).toBe(ex.answer.kind === 'number' ? ex.answer.value : NaN);
    }
  });

  it('a way with small and big jumps gets one picture per stretch', () => {
    const steps = strichSteps(wegpunkte(281, 1000), ['281 + 9 = 290', '290 + 10 = 300', '300 + 700 = 1000']);
    const shown = steps.map((s) => (typeof s !== 'string' && s.visual?.type === 'numberLine' ? s.visual.labels : null));
    expect(shown).toEqual([null, [281, 290, 300], [300, 1000]]);
  });

  it('writes the 1 as one', () => {
    const one = samples(ergaenzenSkill, 1, 4000).find((e) => e.answer.kind === 'number' && e.answer.value === 1 && formOf(e) === 'plus');
    if (!one) throw new Error('no task with 1');
    expect(one.steps[one.steps.length - 1]).toBe('Also fehlt 1.');
    const fast = samples(ergaenzenSkill, 3, 4000).flatMap((e) => e.bugs ?? []).find((b) => b.id === 'neuner-ergaenzung' && b.hint.includes(' 1 Einer'));
    expect(fast?.hint).toBe('Fast! Den 1 Einer ergänzt du bis 10, nicht bis 9.');
  });

  it('every story asks for the distance, with its unit', () => {
    const stories = [...samples(ergaenzenSkill, 2), ...samples(ergaenzenSkill, 3)].filter((e) => e.context);
    expect(stories.length).toBeGreaterThan(0);
    for (const ex of stories) {
      if (ex.answer.kind !== 'number') throw new Error('number');
      expect(ex.answer.unit).toBeTruthy();
      const n = Number(/(\d+) (?:Deckel sind|Punkte\.)/.exec(ex.context as string)?.[1]);
      expect(ex.answer.value).toBe(1000 - n);
    }
  });
});
