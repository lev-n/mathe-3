import { describe, expect, it } from 'vitest';
import { BOX } from '../../core/format';
import { describeSkill } from '../../core/testing';
import { STUFEN } from '../../core/types';
import { CARD_PX } from './helpers';
import { kombinierenSkill } from './kombinieren';
import { agreementProblems, allLevels, atLevel, correctLabel, fachwortOverreach, formOf, longTasks, numberOf, tableFloor, tableOf, textsOf, topShare, treeSize, visualsOf } from './testUtils';

describeSkill(kombinierenSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

/** Brute force: every path through the levels. */
function paths(levels: readonly (readonly string[])[]): string[][] {
  return levels.reduce<string[][]>((acc, level) => acc.flatMap((p) => level.map((o) => [...p, o])), [[]]);
}

describe('daten.kombinieren', () => {
  it('the answer is not a constant: a child cannot type the same number without reasoning', () => {
    for (const stufe of STUFEN) {
      for (const ab of [1, 2, 3] as const) {
        const values = atLevel(kombinierenSkill, stufe, ab, 400).filter((e) => e.answer.kind === 'number').map(numberOf);
        if (values.length === 0) continue;
        expect(new Set(values).size, `Stufe ${stufe}, AB ${ab}`).toBeGreaterThanOrEqual(3);
        expect(topShare(values), `Stufe ${stufe}, AB ${ab}`).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('Stufe 1: pairs around 2 · 3 in rows, counted by enumeration; the plus mistake is recognised', () => {
    for (const ex of atLevel(kombinierenSkill, 1, 1)) {
      const t = tableOf(ex);
      const levels = [t.rows.map((r) => r[0]), t.rows[0][1].split(', ')];
      expect(numberOf(ex)).toBe(paths(levels).length);
      expect(numberOf(ex)).toBeLessThanOrEqual(8);
      if (levels[0].length !== levels[1].length) expect(ex.bugs!.find((b) => b.id === 'kombi-addiert')?.match).toBe(levels[0].length + levels[1].length);
    }
  });

  it('the Baumdiagramm stays on Stufe 3, as in the catalogue', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atLevel(kombinierenSkill, stufe, ab, 80)) expect(visualsOf(ex).some((v) => v.type === 'tree'), ex.key).toBe(false);
      }
    }
  });

  it('no table has hidden columns on a 375 px phone: at most 2 columns of pairs, nothing wider than the card', () => {
    for (const ex of allLevels(kombinierenSkill)) {
      for (const v of visualsOf(ex)) {
        if (v.type !== 'table') continue;
        expect(v.rows.every((r) => !r.includes(BOX)), ex.key).toBe(true);
        expect(tableFloor(v), `${ex.key}: ${v.header.join()}`).toBeLessThanOrEqual(CARD_PX);
      }
    }
  });

  it('a count of 1 stands in the singular, also next to the unit of the answer', () => {
    expect(agreementProblems(kombinierenSkill)).toEqual([]);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(kombinierenSkill)).toEqual([]);
    expect(fachwortOverreach(kombinierenSkill)).toEqual([]);
  });

  it('options stand in full sentences: Dativ after "aus", an article before a book, no telegraphic stem', () => {
    const titles = /aus (Ausflüge|Wege|Brote|Beläge)\b/;
    const bare = /(Nimm zuerst|Mit|Hinter) (Krimi|Comic|Atlas)\b|\bBei (Zoo|Park|See|Burg|Rot|Blau|Gelb|Grün|Toast|Vanille)\b|Auch (Zoo|Park|See|Burg|Grün|Rot|Blau|Gelb) passt|^\S+ bringt \d/;
    for (const ex of allLevels(kombinierenSkill)) {
      for (const t of textsOf(ex)) {
        expect(titles.test(t), `${ex.key}: ${t}`).toBe(false);
        expect(bare.test(t), `${ex.key}: ${t}`).toBe(false);
      }
    }
    for (const ex of atLevel(kombinierenSkill, 2, 3).filter((e) => formOf(e) === 'eins-mehr')) expect(ex.context).toMatch(/Bei den \S+ kommt neu dazu: .+\.$/);
  });

  it('every theme says what it is about, also without a picture: no "Sorte", no "Gefäß", no bare "Ziel"', () => {
    const items = allLevels(kombinierenSkill, 120);
    const about = (ex: (typeof items)[number], word: string) => JSON.stringify([ex.context, ex.prompt, ex.visual ?? null]).includes(word);
    const eis = items.filter((ex) => ex.key.split(':')[3] === 'eis' || ex.key.split(':')[2] === 'eis');
    expect(eis.length).toBeGreaterThan(50);
    for (const ex of eis) expect(about(ex, 'Eis'), ex.key).toBe(true);
    for (const ex of items) for (const t of textsOf(ex)) expect(t, ex.key).not.toMatch(/(?<!\p{L})(Sorten?|Gefäß(e|en)?|Ziele?|Zielen)(?!\p{L})/u);
  });

  it('a Baumdiagramm stays readable: about 12 px labels on a phone, and on paper (55 mm) with at most 12 ends in the task', () => {
    const FONT = 17;
    const FLOOR = 12;
    const PRINT_PX = (55 / 25.4) * 96;
    for (const ex of allLevels(kombinierenSkill, 150)) {
      for (const v of visualsOf(ex)) {
        if (v.type === 'tree') expect((FONT * Math.min(1, CARD_PX / treeSize(v).width)), `${ex.key}: ${v.levels.join(' | ')}`).toBeGreaterThanOrEqual(FLOOR);
      }
      if (ex.visual?.type !== 'tree') continue;
      expect(ex.visual.levels.reduce((n, l) => n * l.length, 1), ex.key).toBeLessThanOrEqual(12);
      expect(PRINT_PX / treeSize(ex.visual).height, ex.key).toBeGreaterThan(0.45);
    }
  });

  it('Stufe 1: the missing pair is not in the table, and every other option is', () => {
    for (const ex of atLevel(kombinierenSkill, 1, 3)) {
      const listed = tableOf(ex).rows.map((r) => r.join(' und '));
      expect(listed.length).toBe(5);
      expect(listed).not.toContain(correctLabel(ex));
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      ex.answer.options.forEach((o, i) => {
        if (ex.answer.kind === 'choice' && i !== ex.answer.correct) expect(listed).toContain(o.label);
      });
    }
  });

  it('Stufe 2: pairs recomputed from the table; 3 things have 6 orders, and the missing orders are 6 minus the listed ones', () => {
    const items = atLevel(kombinierenSkill, 2, 1).filter((e) => formOf(e) === 'paare');
    expect(items.length).toBeGreaterThan(30);
    for (const ex of items) {
      const t = tableOf(ex);
      expect(t.rows.length * t.rows[0][1].split(', ').length).toBe(numberOf(ex));
    }
    const orders = atLevel(kombinierenSkill, 2, 2);
    for (const ex of orders.filter((e) => formOf(e) === 'reihe')) {
      const step = ex.steps[0];
      if (typeof step === 'string' || step.visual?.type !== 'table') throw new Error(ex.key);
      expect(new Set(step.visual.rows.map((r) => r.join())).size).toBe(numberOf(ex));
    }
    const left = orders.filter((e) => formOf(e) === 'reihe-rest');
    expect(left.length).toBeGreaterThan(30);
    for (const ex of left) {
      const rows = tableOf(ex).rows.map((r) => r.join());
      expect(new Set(rows).size).toBe(rows.length);
      expect(numberOf(ex)).toBe(6 - rows.length);
    }
  });

  it('Stufe 2: the missing order is the one order the table does not have', () => {
    for (const ex of atLevel(kombinierenSkill, 2, 3).filter((e) => formOf(e) === 'reihe-fehlt')) {
      const listed = tableOf(ex).rows.map((r) => r.join(', '));
      expect(listed.length).toBe(5);
      expect(listed).not.toContain(correctLabel(ex));
    }
  });

  it('Stufe 3: up to 3 · 3 · 2 with a Baumdiagramm, counted by enumeration', () => {
    const items = atLevel(kombinierenSkill, 3, 2);
    expect(new Set(items.map((ex) => ex.visual?.type))).toEqual(new Set(['tree', 'table']));
    expect(items.map(numberOf)).toContain(18);
    for (const ex of items) {
      // The worked steps always draw the whole tree; the task only when it stays readable.
      const tree = visualsOf(ex).find((v) => v.type === 'tree');
      if (tree?.type !== 'tree') throw new Error(ex.key);
      expect(tree.levels.length).toBe(3);
      expect(numberOf(ex)).toBe(paths(tree.levels).length);
      expect(numberOf(ex)).toBeLessThanOrEqual(18);
    }
    const noTree = atLevel(kombinierenSkill, 3, 3).filter((e) => formOf(e) === 'drei');
    expect(noTree.length).toBeGreaterThan(30);
    for (const ex of noTree) expect(numberOf(ex)).toBe(tableOf(ex).rows.reduce((n, r) => n * r[1].split(', ').length, 1));
  });
});
