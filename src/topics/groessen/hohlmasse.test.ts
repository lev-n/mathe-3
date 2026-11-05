import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { speak } from '../../core/format';
import { containerLabel, labelEvery } from '../../ui/visuals/ContainerVisual';
import { checkWorkedSolution } from '../step-check';
import { byAb, conversionProblem, keysWithDecoration, pluralProblems, stepLines, unitChoiceProblems } from './test-support';
import { hohlmasseSkill } from './hohlmasse';

describeSkill(hohlmasseSkill, { minDistinct: { 1: 20, 2: 20, 3: 15 } });

describe('groessen.hohlmasse', () => {
  it('is an Extra, as the catalogue marks it optional', () => {
    expect(hohlmasseSkill.optional).toBe('extra');
  });

  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(hohlmasseSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('reading the Messbecher: the answer is what it shows', () => {
    let seen = 0;
    for (const ex of byAb(hohlmasseSkill, 1)) {
      if (ex.visual?.type !== 'container' || ex.answer.kind !== 'number') continue;
      seen++;
      expect(ex.answer.value, ex.key).toBe(ex.visual.fillMl);
      expect(ex.visual.fillMl % ex.visual.stepMl, ex.key).toBe(0);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('the same Messbecher or the same pouring has the same key, whatever the liquid or the name', () => {
    const pictures = byAb(hohlmasseSkill).filter((e) => e.visual?.type === 'container');
    expect(pictures.length).toBeGreaterThan(50);
    expect(keysWithDecoration(pictures, (e) => JSON.stringify([e.visual, e.answer]))).toEqual([]);
  });

  it('the worked steps read the Messbecher as the hint says: the labelled number of the picture, then tick by tick', () => {
    let between = 0;
    for (const ex of byAb(hohlmasseSkill)) {
      if (ex.visual?.type !== 'container' || ex.answer.kind !== 'number' || ex.context) continue;
      const v = ex.visual;
      const lines = stepLines(ex).join(' ').replace(/\u00A0/g, ' ');
      const labelled = labelEvery(v.capacityMl, v.stepMl) * v.stepMl;
      const last = Math.floor(v.fillMl / labelled) * labelled;
      expect(lines, ex.key).not.toMatch(/\d{2,} · \d{2,}/);
      if (v.fillMl === last) expect(lines, ex.key).toContain(`Zahl ${last}.`);
      else if (last > 0) {
        between++;
        expect(lines, ex.key).toContain(`${last} ml + ${v.fillMl - last} ml = ${v.fillMl} ml`);
      }
    }
    expect(between).toBeGreaterThan(20);
  });

  it('srText holds what the Messbecher shows, where only the picture has the numbers', () => {
    for (const ex of byAb(hohlmasseSkill)) if (ex.visual?.type === 'container' && !ex.context) expect(ex.srText, ex.key).toContain(speak(containerLabel(ex.visual)));
  });

  it('pouring: the picture is the 250 ml cup of the story, and the steps go by 4 cups for 1 l, without dividing by 250', () => {
    let seen = 0;
    for (const ex of byAb(hohlmasseSkill)) {
      if (!ex.key.includes(':becherfuellen:') || ex.answer.kind !== 'number') continue;
      seen++;
      expect(ex.visual, ex.key).toEqual({ type: 'container', capacityMl: 250, fillMl: 250, stepMl: 50 });
      const lines = stepLines(ex).map((l) => l.replace(/\u00A0/g, ' '));
      expect(lines.join(' '), ex.key).not.toMatch(/: 250/);
      expect(lines[lines.length - 1], ex.key).toContain(`${ex.answer.value} Becher`);
      if ((ex.answer.value as number) >= 4) expect(lines[0], ex.key).toContain('In 1 l passen 4 Becher.');
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a choice of units names its options as words for the screen reader', () => {
    for (const ex of byAb(hohlmasseSkill, 1)) expect(unitChoiceProblems(ex)).toEqual([]);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(hohlmasseSkill)) expect(pluralProblems(ex)).toEqual([]);
  });

  it('¼ l as 25 ml is matched, ¾ l is 750 ml', () => {
    for (const ex of byAb(hohlmasseSkill, 3).filter((e) => e.key.includes(':viertel:'))) {
      const m = /viertel:(\d):(\d)/.exec(ex.key)!;
      const [q, n] = [Number(m[1]), Number(m[2])];
      if (ex.answer.kind !== 'number') throw new Error('number expected');
      expect(ex.answer.value, ex.key).toBe(n * 1000 + q * 250);
      expect(ex.bugs!.find((b) => b.id === 'liter-25')!.match, ex.key).toBe(n * 1000 + (q === 1 ? 25 : 75));
    }
  });

  it('pouring into 250 ml cups: the number of cups times 250 ml is the amount', () => {
    let seen = 0;
    for (const ex of byAb(hohlmasseSkill, 3)) {
      if (!ex.context || ex.answer.kind !== 'number') continue;
      seen++;
      const t = ex.context.replace(/ /g, ' ');
      const whole = /füllt (?:(\d+) l )?(?:(\d+) ml )?Saft/.exec(t)!;
      expect((ex.answer.value as number) * 250, ex.key).toBe(Number(whole[1] ?? 0) * 1000 + Number(whole[2] ?? 0));
    }
    expect(seen).toBeGreaterThan(20);
  });
});
