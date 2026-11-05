import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { STUFEN } from '../../core/types';
import type { Exercise, Visual } from '../../core/types';
import { describeSkill } from '../../core/testing';
import { CTX } from '../test-utils';
import { chancenSkill } from './chancen';
import { agreementProblems, atLevel, fachwortOverreach, formOf, longTasks, topShare } from './testUtils';

describeSkill(chancenSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const NOUN_TO_COLOR: Record<string, string> = { Rot: 'rot', Blau: 'blau', Gelb: 'gelb', Grün: 'gruen', Lila: 'lila', Orange: 'orange' };
const targetOf = (ex: Exercise) => NOUN_TO_COLOR[/(Rot|Blau|Gelb|Grün|Lila|Orange)/.exec(ex.prompt)![1]];

const bagCounts = (v: Visual | undefined, color: string) => {
  if (v?.type !== 'bag') throw new Error('a bag expected');
  return { hit: v.balls.filter((b) => b.color === color).reduce((a, b) => a + b.count, 0), total: v.balls.reduce((a, b) => a + b.count, 0) };
};
const choice = (ex: Exercise) => {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: a choice expected`);
  return ex.answer;
};

describe('daten.chancen', () => {
  it('has choice answers only, as in the catalogue', () => {
    for (const stufe of STUFEN) for (const ab of [1, 2, 3] as const) for (const ex of atLevel(chancenSkill, stufe, ab, 60)) expect(ex.answer.kind).toBe('choice');
  });

  it('Stufe 1: all bags have the same total, and the correct bag has the most of the colour', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atLevel(chancenSkill, 1, ab)) {
        const a = choice(ex);
        const counts = a.options.map((o) => bagCounts(o.visual, targetOf(ex)));
        expect(new Set(counts.map((c) => c.total)).size).toBe(1);
        expect(counts[a.correct].hit).toBe(Math.max(...counts.map((c) => c.hit)));
      }
    }
  });

  it('Stufe 2: wheels of equal size; the correct wheel has the most fields of the colour', () => {
    for (const ab of [1] as const) {
      for (const ex of atLevel(chancenSkill, 2, ab)) {
        const a = choice(ex);
        const counts = a.options.map((o) => {
          if (o.visual?.type !== 'spinner') throw new Error(ex.key);
          return { hit: o.visual.sectors.filter((s) => s === targetOf(ex)).length, total: o.visual.sectors.length };
        });
        expect(new Set(counts.map((c) => c.total)).size).toBe(1);
        expect(counts[a.correct].hit).toBe(Math.max(...counts.map((c) => c.hit)));
      }
    }
  });

  it('Stufe 2: the place of the fields does not change the chance, the number does', () => {
    for (const ex of atLevel(chancenSkill, 2, 3)) {
      const a = choice(ex);
      const [hitA, hitB] = a.options.flatMap((o) => (o.visual?.type === 'spinner' ? [o.visual.sectors.filter((s) => s === targetOf(ex)).length] : []));
      expect(a.correct, ex.key).toBe(hitA === hitB ? 2 : hitA > hitB ? 0 : 1);
    }
  });

  it('Stufe 1: "gleich" is correct only when both bags have the same chance', () => {
    const bags = atLevel(chancenSkill, 1, 3).filter((e) => formOf(e) === 'gleich');
    expect(bags.length).toBeGreaterThan(30);
    for (const ex of bags) {
      const a = choice(ex);
      const [A, B] = a.options.slice(0, 2).map((o) => bagCounts(o.visual, targetOf(ex)));
      expect(A.total).toBe(B.total);
      expect(a.correct, ex.key).toBe(A.hit === B.hit ? 2 : A.hit > B.hit ? 0 : 1);
    }
  });

  it('"gleich" is a real option: never always correct, and the correct option has no fixed place', () => {
    for (const [stufe, ab] of [[1, 3], [2, 2], [2, 3]] as const) {
      const items = atLevel(chancenSkill, stufe, ab, 600).filter((e) => choice(e).options.some((o) => /gleich/.test(o.label)));
      expect(items.length).toBeGreaterThan(50);
      const correctSame = items.filter((e) => /gleich/.test(choice(e).options[choice(e).correct].label)).length;
      expect(correctSame / items.length, `Stufe ${stufe}, AB ${ab}`).toBeLessThan(0.75);
      expect(topShare(items.map((e) => choice(e).correct)), `Stufe ${stufe}, AB ${ab}`).toBeLessThan(0.75);
    }
  });

  it('the Würfel: the stem says what is compared, and all numbers of one choice are counted', () => {
    const dice = [...atLevel(chancenSkill, 1, 3), ...atLevel(chancenSkill, 2, 2)].filter((e) => formOf(e).startsWith('wuerfel'));
    expect(dice.length).toBeGreaterThan(50);
    for (const ex of dice) {
      expect(ex.context).not.toMatch(/Die Zahlen sind/);
      expect(ex.context).toMatch(/Vergleiche|Wahl/);
      expect(choice(ex).options[choice(ex).correct].label).toBe(formOf(ex) === 'wuerfel' ? 'Beide haben die gleiche Chance.' : ex.key.split(':').slice(3).map((n) => `die ${n}`).join(' oder '));
    }
  });

  it('a count of 1 stands in the singular', () => {
    expect(agreementProblems(chancenSkill)).toEqual([]);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(chancenSkill)).toEqual([]);
    expect(fachwortOverreach(chancenSkill)).toEqual([]);
  });

  it('Stufe 3: fair means the same number of Kugeln, and changing the bag is recomputed', () => {
    for (const ex of atLevel(chancenSkill, 3, 1).filter((e) => formOf(e) === 'fair' && e.visual?.type === 'bag')) {
      if (ex.visual?.type !== 'bag') throw new Error(ex.key);
      const [a, b] = ex.visual.balls.map((x) => x.count);
      expect(choice(ex).correct).toBe(a === b ? 0 : a > b ? 1 : 2);
    }
    for (const ex of atLevel(chancenSkill, 3, 2)) {
      if (ex.visual?.type !== 'bag') throw new Error(ex.key);
      const [first, second] = ex.visual.balls.map((x) => x.count);
      const k = Number(/noch (\d+)/.exec(ex.context!)![1]);
      expect(choice(ex).correct).toBe(first + k > second ? 0 : first + k < second ? 1 : 2);
    }
  });

  it('Stufe 3: making it fair adds the difference to the smaller colour', () => {
    const items = atLevel(chancenSkill, 3, 3).filter((e) => formOf(e) === 'fair-machen');
    expect(items.length).toBeGreaterThan(30);
    for (const ex of items) {
      if (ex.visual?.type !== 'bag') throw new Error(ex.key);
      const [few, many] = ex.visual.balls.map((x) => x.count);
      const a = choice(ex);
      expect(Number(a.options[a.correct].label.split(' ')[0])).toBe(many - few);
    }
  });

  it('Stufe 3: more Kugeln of the colour do not win against a majority of the colour (anzahl-statt-anteil)', () => {
    const items = atLevel(chancenSkill, 3, 3).filter((e) => formOf(e) === 'anteil');
    expect(items.length).toBeGreaterThan(30);
    for (const ex of items) {
      const a = choice(ex);
      const right = bagCounts(a.options[a.correct].visual, targetOf(ex));
      const wrong = bagCounts(a.options[1 - a.correct].visual, targetOf(ex));
      expect(wrong.hit).toBeGreaterThan(right.hit);
      expect(right.hit * 2).toBeGreaterThan(right.total);
      expect(wrong.hit * 2).toBeLessThan(wrong.total);
      expect(a.options[1 - a.correct].whyWrong).toMatch(/anderen Kugeln/);
    }
  });

  it('compares two with "größer", and names a colour in a whole sentence', () => {
    const all = STUFEN.flatMap((stufe) => Array.from({ length: 1500 }, (_, i) => chancenSkill.generate(createRng(i * 13 + 1), stufe, { ...CTX, extras: true })));
    for (const ex of all) {
      if (ex.answer.kind !== 'choice') continue;
      const big = ex.answer.options.filter((o) => /^(Säckchen|Rad) /.test(o.label)).length;
      if (/am größten/.test(ex.prompt)) expect(big, ex.key).toBe(3);
      for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toMatch(/Kugeln (Rot|Blau|Gelb|Grün|Lila|Orange)\b/);
    }
    expect(all.some((ex) => /(Säckchen|Rad|Wo ).*größer\?$/.test(ex.prompt))).toBe(true);
    expect(all.some((ex) => /am größten\?$/.test(ex.prompt))).toBe(true);
  });
});
