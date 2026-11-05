import { describe, expect, it } from 'vitest';
import { STUFEN } from '../../core/types';
import { describeSkill } from '../../core/testing';
import { sicherMoeglichSkill } from './sicher-moeglich';
import { agreementProblems, atLevel, correctLabel, fachwortOverreach, formOf, longTasks, topShare } from './testUtils';

describeSkill(sicherMoeglichSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const COLOR: Record<string, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };

describe('daten.sicher-moeglich', () => {
  it('Stufe 1: the word follows from the bag: all, some or no Kugeln fit', () => {
    for (const ex of atLevel(sicherMoeglichSkill, 1, 1)) {
      if (ex.visual?.type !== 'bag') throw new Error(ex.key);
      const event = /Die Kugel ist (.+)\./.exec(ex.context!)![1].split(' oder ');
      const fits = ex.visual.balls.filter((b) => event.includes(COLOR[b.color])).length;
      const word = fits === 0 ? 'unmöglich' : fits === ex.visual.balls.length ? 'sicher' : 'möglich';
      expect(correctLabel(ex), ex.key).toBe(word);
    }
  });

  it('Stufe 1: a large majority is still only "möglich", and the option "sicher" says why', () => {
    const items = atLevel(sicherMoeglichSkill, 1, 1).filter((ex) => correctLabel(ex) === 'möglich');
    expect(items.length).toBeGreaterThan(30);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options.find((o) => o.label === 'sicher')?.whyWrong).toMatch(/immer/);
    }
  });

  it('Stufe 2: the sectors of a wheel decide the word', () => {
    for (const ex of atLevel(sicherMoeglichSkill, 2, 1)) {
      if (ex.visual?.type !== 'spinner') throw new Error(ex.key);
      const target = /auf (\S+) stehen/.exec(ex.context!)![1].toLowerCase().replace('grün', 'gruen');
      const n = ex.visual.sectors.filter((s) => s === target).length;
      expect(correctLabel(ex), ex.key).toBe(n === 0 ? 'unmöglich' : n === ex.visual.sectors.length ? 'sicher' : 'möglich');
    }
  });

  it('Stufe 2: "Welcher Satz stimmt?": the wording does not give the true sentence away', () => {
    const items = atLevel(sicherMoeglichSkill, 2, 3, 600).filter((ex) => formOf(ex) === 'satz');
    expect(items.length).toBeGreaterThan(100);
    const word = (label: string) => /möglich, aber nicht sicher|unmöglich|sicher/.exec(label)![0];
    expect(topShare(items.map((ex) => word(correctLabel(ex)))), 'no word is always the true one').toBeLessThan(0.45);
    expect(new Set(items.map((ex) => ex.hints.join())).size, 'the hints name no option').toBe(1);
    const colorOf = (noun: string) => noun.toLowerCase().replace('grün', 'gruen');
    for (const ex of items) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'spinner') throw new Error(ex.key);
      expect(new Set(ex.answer.options.map((o) => word(o.label))).size, `${ex.key}: every word stands on the options`).toBe(3);
      expect(ex.answer.options.some((o) => o.label.includes(' oder ')), `${ex.key}: "oder" does not mark the true sentence`).toBe(true);
      // The true sentence follows from the wheel.
      const label = correctLabel(ex);
      const nouns = label.split(' ist ')[0].split(' oder ');
      if (nouns.length === 2) expect(new Set(ex.visual.sectors), ex.key).toEqual(new Set(nouns.map(colorOf)));
      else expect(ex.visual.sectors.includes(colorOf(nouns[0]) as never), ex.key).toBe(!label.includes('unmöglich'));
    }
  });

  it('Stufe 3: the picture does not show the solution: the bag is not in the target order', () => {
    const colors = atLevel(sicherMoeglichSkill, 3, 2);
    for (const ex of colors) {
      if (ex.visual?.type !== 'bag' || ex.answer.kind !== 'order') throw new Error(ex.key);
      const target = ex.answer.correct.map((i) => (ex.answer as { items: string[] }).items[i].toLowerCase());
      expect(ex.visual.balls.map((b) => COLOR[b.color]), ex.key).not.toEqual(target);
    }
    const events = atLevel(sicherMoeglichSkill, 3, 3);
    const largeFirst = events.map((ex) => (ex.visual?.type === 'bag' ? ex.visual.balls[0].count > ex.visual.balls[1].count : false));
    expect(topShare(largeFirst), 'the larger group of Kugeln has no fixed place').toBeLessThan(0.7);
  });

  it('Stufe 3: the order goes by the number of Kugeln, and its reverse has a hint', () => {
    for (const ex of atLevel(sicherMoeglichSkill, 3, 2)) {
      if (ex.visual?.type !== 'bag' || ex.answer.kind !== 'order') throw new Error(ex.key);
      const count = (noun: string) => ex.visual!.type === 'bag' ? ex.visual!.balls.find((b) => COLOR[b.color] === noun.toLowerCase())!.count : 0;
      const ordered = ex.answer.correct.map((i) => count((ex.answer as { items: string[] }).items[i]));
      expect(ordered).toEqual([...ordered].sort((a, b) => b - a));
      expect(ex.bugs![0].match).toEqual([...ex.answer.correct].reverse());
    }
  });

  it('Stufe 3: the order of events runs from sicher to unmöglich and is never shown solved', () => {
    for (const ex of atLevel(sicherMoeglichSkill, 3, 3)) {
      if (ex.answer.kind !== 'order') throw new Error(ex.key);
      expect(ex.answer.items.length).toBe(4);
      expect(ex.answer.correct).not.toEqual([0, 1, 2, 3]);
      expect(ex.answer.items[ex.answer.correct[0]]).toContain(' oder ');
    }
  });

  it('Stufe 3: the prompt says that the chance is what is large, because the order input speaks of "das Größte"', () => {
    for (const ab of [2, 3] as const) for (const ex of atLevel(sicherMoeglichSkill, 3, ab)) expect(ex.prompt, ex.key).toMatch(/Ordne von/);
  });

  it('a count of 1 stands in the singular, also next to the unit of the answer', () => {
    expect(agreementProblems(sicherMoeglichSkill)).toEqual([]);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(sicherMoeglichSkill)).toEqual([]);
    expect(fachwortOverreach(sicherMoeglichSkill)).toEqual([]);
  });

  it('standalone "wahrscheinlich" appears on Stufe 3 only (C10), and no number stands for a chance', () => {
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atLevel(sicherMoeglichSkill, stufe, ab, 80)) {
          const text = JSON.stringify([ex.prompt, ex.context, ex.answer, ex.hints, ex.steps]);
          if (stufe !== 3) expect(/wahrscheinlich/i.test(text), ex.key).toBe(false);
          expect(/%|\d\s*von\s*\d/.test(text), ex.key).toBe(false);
        }
      }
    }
  });
});
