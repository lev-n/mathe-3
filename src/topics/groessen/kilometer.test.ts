import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { byAb, conversionProblem, pluralProblems, unitChoiceProblems } from './test-support';
import { kilometerSkill } from './kilometer';

describeSkill(kilometerSkill, { minDistinct: { 1: 20, 2: 30, 3: 25 } });

describe('groessen.kilometer', () => {
  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(kilometerSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('every value of a conversion or story stays ≤ 9 km (§6), also with a metre part', () => {
    for (const ex of byAb(kilometerSkill)) {
      if (ex.key.includes(':einheit:')) continue;
      const a = ex.answer;
      const answer = a.kind === 'number' ? (a.value as number) : a.kind === 'multi' ? a.fields[0].value * 1000 + a.fields[1].value : 0;
      expect(answer, ex.key).toBeLessThanOrEqual(9000);
    }
  });

  it('the comma with km stays on Stufe 3 (§2.2)', () => {
    const comma = (text: string | undefined) => /\d,\d/.test(text ?? '');
    let seen = 0;
    for (const ex of byAb(kilometerSkill)) {
      const has = comma(ex.expression) || comma(ex.prompt) || (ex.answer.kind === 'number' && !Number.isInteger(ex.answer.value));
      if (ex.stufe < 3) expect(has, ex.key).toBe(false);
      else if (has) seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('3 km as 300 m is matched, with or without a rest in metres', () => {
    for (const ex of byAb(kilometerSkill).filter((e) => e.key.includes(':kmm:') || e.key.includes(':km:'))) {
      const a = ex.answer;
      if (a.kind !== 'number') throw new Error('number expected');
      const n = Math.floor((a.value as number) / 1000);
      expect(ex.bugs!.find((b) => b.id === 'km-100')!.match, ex.key).toBe(n * 100 + (a.value as number) % 1000);
    }
  });

  it('choosing m or km: the right unit fits the distance, and stories add up', () => {
    let seen = 0;
    for (const ex of byAb(kilometerSkill)) {
      const a = ex.answer;
      if (a.kind === 'choice' && ex.key.includes(':einheit:')) {
        seen++;
        expect(['m', 'km']).toContain(a.options[a.correct].label);
      }
      if (a.kind === 'number' && ex.prompt.includes('zusammen')) {
        const meters = [...ex.context!.matchAll(/(\d+) km (\d+) m|(\d+) m/g)].reduce((s, m) => s + (m[3] ? Number(m[3]) : Number(m[1]) * 1000 + Number(m[2])), 0);
        expect(a.value, ex.key).toBe(meters);
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a choice of units names its options as words for the screen reader', () => {
    for (const ex of byAb(kilometerSkill, 1)) expect(unitChoiceProblems(ex)).toEqual([]);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(kilometerSkill)) expect(pluralProblems(ex)).toEqual([]);
  });

  it('"gleich lang" has one right answer, and it equals the km value', () => {
    for (const ex of byAb(kilometerSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'choice') continue;
      const [km] = /\d+,\d/.exec(ex.prompt)!;
      expect(a.options[a.correct].label.replace(/ /g, ' ')).toBe(`${Math.round(Number(km.replace(',', '.')) * 1000)} m`);
    }
  });
});
