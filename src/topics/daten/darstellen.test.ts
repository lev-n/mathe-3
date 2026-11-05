import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { darstellenSkill } from './darstellen';
import { CARD_PX, OPTION_PX, SMALL_THEMES } from './helpers';
import { agreementProblems, allLevels, atLevel, chartFloor, correctLabel, fachwortOverreach, longTasks, tableFloor, textsOf, visualsOf } from './testUtils';

describeSkill(darstellenSkill, { minDistinct: 40 });

describe('daten.darstellen', () => {
  it('Stufe 1: the table fields are the counts of the Strichliste, up to 50', () => {
    for (const ab of [1, 3] as const) {
      for (const ex of atLevel(darstellenSkill, 1, ab)) {
        if (ex.visual?.type !== 'tally' || ex.answer.kind !== 'multi') throw new Error(ex.key);
        expect(ex.answer.fields.map((f) => f.value)).toEqual(ex.visual.rows.map((r) => r.count));
        ex.visual.rows.forEach((r) => expect(r.count).toBeLessThanOrEqual(50));
      }
    }
  });

  it('Stufe 1: a bundle read as 4 strokes or as 1 thing is recognised', () => {
    const ex = atLevel(darstellenSkill, 1, 3).find((e) => e.bugs?.length === 2)!;
    if (ex.visual?.type !== 'tally') throw new Error(ex.key);
    const four = ex.bugs!.find((b) => b.id === 'buendel-als-vier')!;
    expect(Object.values(four.match)).toEqual(ex.visual.rows.map((r) => r.count - Math.floor(r.count / 5)));
  });

  it('Stufe 2: the correct chart shows exactly the numbers of the table', () => {
    for (const ab of [2, 3] as const) {
      for (const ex of atLevel(darstellenSkill, 2, ab)) {
        const a = ex.answer;
        if (ex.visual?.type !== 'table' || a.kind !== 'choice') throw new Error(ex.key);
        const right = a.options[a.correct].visual;
        if (right?.type !== 'barChart') throw new Error(ex.key);
        expect(right.values).toEqual(ex.visual.rows.map((r) => Number(r[1])));
        expect(right.axisMax).toBeLessThanOrEqual(50);
        a.options.forEach((o, i) => {
          if (i !== a.correct && o.visual?.type === 'barChart') expect(o.visual.values).not.toEqual(right.values);
        });
      }
    }
  });

  it('a category after "bei" stands in the Dativ, with the word of the theme', () => {
    const wrong = SMALL_THEMES.flatMap((t) => t.cats).filter((c) => c.at !== `bei ${c.label}`).map((c) => `bei ${c.label}`);
    expect(wrong.length).toBeGreaterThan(5);
    for (const ex of allLevels(darstellenSkill)) for (const t of textsOf(ex)) for (const w of wrong) expect(t, ex.key).not.toMatch(new RegExp(`${w}(?!\\p{L})`, 'u'));
    const cats = atLevel(darstellenSkill, 3, 1);
    for (const ex of cats) expect(SMALL_THEMES.flatMap((t) => t.cats).some((c) => ex.context!.includes(` ${c.at} die Zahl`)), ex.key).toBe(true);
  });

  it('a count of 1 stands in the singular, also next to the unit of the answer', () => {
    expect(agreementProblems(darstellenSkill)).toEqual([]);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(darstellenSkill)).toEqual([]);
    expect(fachwortOverreach(darstellenSkill)).toEqual([]);
  });

  it('the chart draws marks, so no text speaks of boxes', () => {
    for (const ex of allLevels(darstellenSkill)) for (const t of textsOf(ex)) expect(t, ex.key).not.toMatch(/Kästchen/);
  });

  it('charts and tables fit a 375 px phone: all columns of the options stay in view (every seed, not a sample)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atLevel(darstellenSkill, stufe, ab, 400)) {
          const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.visual ? [o.visual] : [])) : [];
          for (const v of options) {
            if (v.type === 'barChart') expect(chartFloor(v), ex.key).toBeLessThanOrEqual(OPTION_PX);
            if (v.type === 'table') expect(tableFloor(v), ex.key).toBeLessThanOrEqual(OPTION_PX);
          }
          for (const v of visualsOf(ex)) if (v.type === 'barChart') expect(chartFloor(v), ex.key).toBeLessThanOrEqual(CARD_PX);
        }
      }
    }
  });

  it('Stufe 3: the marked row is the only one that does not fit the Strichliste', () => {
    for (const ex of atLevel(darstellenSkill, 3, 2)) {
      if (ex.visual?.type !== 'tally' || ex.answer.kind !== 'choice') throw new Error(ex.key);
      const counts = new Map(ex.visual.rows.map((r) => [r.label, r.count]));
      const misfits = ex.answer.options.filter((o) => {
        const [label, n] = o.label.split(': ');
        return counts.get(label) !== Number(n);
      });
      expect(misfits.map((o) => o.label)).toEqual([correctLabel(ex)]);
    }
  });

  it('Stufe 3: the right value is what the diagram shows, not the copied number', () => {
    const items = atLevel(darstellenSkill, 3, 3).filter((ex) => ex.answer.kind === 'number');
    expect(items.length).toBeGreaterThan(20);
    for (const ex of items) {
      if (ex.visual?.type !== 'barChart' || ex.answer.kind !== 'number') throw new Error(ex.key);
      const i = ex.visual.categories.indexOf(ex.key.split(':')[5]);
      expect(ex.answer.value).toBe(ex.visual.values[i]);
    }
  });
});
