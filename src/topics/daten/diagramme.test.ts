import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { diagrammeSkill } from './diagramme';
import { CARD_PX } from './helpers';
import { agreementProblems, allLevels, atLevel, chartFloor, fachwortOverreach, formOf, longTasks, numberOf, textsOf, visualsOf } from './testUtils';

describeSkill(diagrammeSkill, { minDistinct: 40 });

const barOf = (ex: ReturnType<typeof atLevel>[number]) => {
  if (ex.visual?.type !== 'barChart') throw new Error(`${ex.key}: a chart expected`);
  return ex.visual;
};

describe('daten.diagramme', () => {
  it('Stufe 1: axis step 1 or 2', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atLevel(diagrammeSkill, 1, ab)) {
        if (ex.visual?.type === 'barChart') expect([1, 2]).toContain(ex.visual.axisStep);
        if (ex.visual?.type === 'pictogram') expect(ex.visual.iconValue).toBe(2);
      }
    }
  });

  it('Stufe 2: step 5 or 10; differences and totals recomputed, totals up to 100', () => {
    for (const ex of atLevel(diagrammeSkill, 2, 3)) {
      const v = barOf(ex);
      expect([5, 10]).toContain(v.axisStep);
      const total = v.values.reduce((a, b) => a + b, 0);
      expect(numberOf(ex)).toBe(total);
      expect(total).toBeLessThanOrEqual(100);
    }
    for (const ex of atLevel(diagrammeSkill, 2, 2).filter((e) => formOf(e) === 'mehr')) {
      const v = barOf(ex);
      const [hi, lo] = ex.key.split(':').slice(7, 9).map((c) => v.values[v.categories.indexOf(c)]);
      expect(numberOf(ex)).toBe(hi - lo);
    }
  });

  it('Stufe 3: Balken with step 50, up to 500; a value between marks is halfway', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atLevel(diagrammeSkill, 3, ab)) {
        if (ex.visual?.type !== 'barChart') continue;
        expect(ex.visual.horizontal).toBe(true);
        expect(ex.visual.axisStep).toBe(50);
        expect(ex.visual.axisMax).toBe(500);
      }
    }
    const between = atLevel(diagrammeSkill, 3, 3).filter((e) => formOf(e) === 'zwischen');
    expect(between.length).toBeGreaterThan(50);
    for (const ex of between) {
      expect(numberOf(ex) % 50).toBe(25);
      expect(barOf(ex).values).toContain(numberOf(ex));
    }
  });

  it('Stufe 3: the total also stays at most 500 (catalogue), and it has variety', () => {
    const totals = atLevel(diagrammeSkill, 3, 3, 800).filter((e) => formOf(e) === 'insgesamt');
    expect(totals.length).toBeGreaterThan(50);
    for (const ex of totals) expect(numberOf(ex), ex.key).toBeLessThanOrEqual(500);
    expect(new Set(totals.map(numberOf)).size).toBeGreaterThanOrEqual(5);
  });

  it('a count of 1 stands in the singular, also next to the unit of the answer', () => {
    expect(agreementProblems(diagrammeSkill)).toEqual([]);
  });

  it('Stufe 1: with marks 1 apart the step says "ist es 1", and no answer is "1 Kinder"', () => {
    const items = atLevel(diagrammeSkill, 1, 1, 600);
    const read = items.filter((e) => formOf(e) === 'lesen');
    expect(read.length).toBeGreaterThan(100);
    for (const ex of read) {
      expect(ex.steps[0], ex.key).toBe('Von Strich zu Strich ist es 1.');
      expect(numberOf(ex), ex.key).toBeGreaterThanOrEqual(2);
    }
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(diagrammeSkill)).toEqual([]);
    expect(fachwortOverreach(diagrammeSkill)).toEqual([]);
  });

  it('the chart draws marks, so no text speaks of boxes', () => {
    for (const ex of allLevels(diagrammeSkill)) for (const t of textsOf(ex)) expect(t, ex.key).not.toMatch(/Kästchen/);
    for (const line of Object.values(diagrammeSkill.stufen)) expect(line).not.toMatch(/Kästchen/);
  });

  it('a Säulendiagramm fits a 375 px phone without sideways scrolling', () => {
    for (const ex of allLevels(diagrammeSkill)) {
      for (const v of visualsOf(ex)) if (v.type === 'barChart' && !v.horizontal) expect(chartFloor(v), ex.key).toBeLessThanOrEqual(CARD_PX);
    }
  });

  it('the misreading of the scale is recognised: marks or pictures counted as the value', () => {
    for (const ex of atLevel(diagrammeSkill, 2, 1).filter((e) => formOf(e) === 'lesen' && e.visual?.type === 'barChart')) {
      expect(ex.bugs!.find((b) => b.id === 'achse-schritt')?.match).toBe(numberOf(ex) / barOf(ex).axisStep);
    }
    const pictures = atLevel(diagrammeSkill, 2, 2).filter((e) => e.visual?.type === 'pictogram');
    expect(pictures.length).toBeGreaterThan(10);
    for (const ex of pictures) {
      if (ex.visual?.type !== 'pictogram') throw new Error(ex.key);
      expect(ex.bugs!.find((b) => b.id === 'bild-legende')?.match).toBe(numberOf(ex) / ex.visual.iconValue);
    }
  });
});
