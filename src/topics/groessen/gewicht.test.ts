import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { speak } from '../../core/format';
import { labelStep, scaleLabel } from '../../ui/visuals/ScaleVisual';
import { checkWorkedSolution } from '../step-check';
import { byAb, conversionProblem, keysWithDecoration, pluralProblems, stepLines, unitChoiceProblems } from './test-support';
import { gewichtSkill } from './gewicht';

describeSkill(gewichtSkill, { minDistinct: { 1: 25, 2: 30, 3: 25 } });

describe('groessen.gewicht', () => {
  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(gewichtSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('reading the scale: the answer is what the scale shows, on the step of the catalogue', () => {
    let seen = 0;
    for (const ex of byAb(gewichtSkill)) {
      if (ex.visual?.type !== 'scale') continue;
      seen++;
      const a = ex.answer;
      const shown = a.kind === 'number' ? a.value : a.kind === 'multi' ? a.fields[0].value * 1000 + a.fields[1].value : -1;
      expect(shown, ex.key).toBe(ex.visual.grams);
      expect(ex.visual.grams % ex.visual.stepGrams, ex.key).toBe(0);
      if (ex.stufe === 1) expect(ex.visual.stepGrams, ex.key).toBe(100);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the worked steps read the scale as the hint says: the labelled number of the picture, then tick by tick', () => {
    let between = 0;
    for (const ex of byAb(gewichtSkill)) {
      if (ex.visual?.type !== 'scale') continue;
      const v = ex.visual;
      const lines = stepLines(ex).join(' ').replace(/\u00A0/g, ' ');
      const labelled = labelStep(v.maxGrams, v.stepGrams);
      const last = Math.floor(v.grams / labelled) * labelled;
      expect(lines, ex.key).not.toMatch(/\d{2,} · \d{2,}/);
      expect(lines, ex.key).toContain(`Zahl ${v.grams === last ? v.grams : last}.`);
      if (v.grams !== last && last > 0) {
        between++;
        expect(lines, ex.key).toContain(`${last} g + ${v.grams - last} g = ${v.grams} g`);
      }
    }
    expect(between).toBeGreaterThan(20);
  });

  it('srText holds what the scale shows: the answer field is described by it alone', () => {
    for (const ex of byAb(gewichtSkill)) if (ex.visual?.type === 'scale') expect(ex.srText, ex.key).toContain(speak(scaleLabel(ex.visual)));
  });

  it('a choice of units names its options as words for the screen reader', () => {
    for (const ex of byAb(gewichtSkill, 1)) expect(unitChoiceProblems(ex)).toEqual([]);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(gewichtSkill)) expect(pluralProblems(ex)).toEqual([]);
  });

  it('the same scale with the same answer has the same key, whatever lies on it', () => {
    const scales = byAb(gewichtSkill).filter((e) => e.visual?.type === 'scale');
    expect(scales.length).toBeGreaterThan(50);
    expect(keysWithDecoration(scales, (e) => JSON.stringify([e.visual, e.answer]))).toEqual([]);
  });

  it('2 kg as 200 g, ½ kg as 50 g and a misread scale are matched', () => {
    const kg = byAb(gewichtSkill, 2).find((e) => e.key.includes(':kgg:'))!;
    const a = kg.answer;
    if (a.kind !== 'number') throw new Error('number expected');
    expect(kg.bugs!.find((b) => b.id === 'kg-100')!.match).toBe(Math.floor((a.value as number) / 1000) * 100 + (a.value as number) % 1000);
    expect(byAb(gewichtSkill, 3).find((e) => e.key.endsWith(':halb'))!.bugs!.find((b) => b.id === 'halb-kg')!.match).toBe(50);
    expect(byAb(gewichtSkill, 1).find((e) => e.visual?.type === 'scale')!.bugs!.some((b) => b.id === 'skala-schritt')).toBe(true);
  });

  it('choosing g or kg: the unit fits the thing', () => {
    let seen = 0;
    for (const ex of byAb(gewichtSkill, 1)) {
      const a = ex.answer;
      if (a.kind !== 'choice') continue;
      seen++;
      expect(a.options.map((o) => o.label).sort()).toEqual(['g', 'kg']);
      const right = a.options[a.correct].label;
      const wrong = a.options[1 - a.correct].whyWrong!;
      expect(wrong, ex.key).toMatch(right === 'g' ? /schwer/ : /leicht/);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('weight stories add up, and the flour stays 1 kg', () => {
    let seen = 0;
    for (const ex of byAb(gewichtSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'number' || !ex.context) continue;
      seen++;
      if (ex.context.startsWith('Eine Packung')) expect(a.value, ex.key).toBe(Number(/wiegen (\d+)/.exec(ex.prompt)![1]) * 1000);
      else {
        const [, kg, g] = /(\d+) kg Mehl und (\d+) g/.exec(ex.context)!;
        expect(a.value, ex.key).toBe(Number(kg) * 1000 + Number(g));
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('groessen.gewicht wording', () => {
  it('"Wie viel wiegt" stays singular', () => {
    for (const ex of byAb(gewichtSkill)) if (ex.prompt.includes('Wie viel wiegt')) expect(ex.prompt, ex.key).toMatch(/wiegt (der|das) /);
  });
});
