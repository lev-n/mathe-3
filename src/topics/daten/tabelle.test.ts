import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { CARD_PX } from './helpers';
import { tabelleSkill } from './tabelle';
import { agreementProblems, allLevels, atLevel, fachwortOverreach, formOf, longTasks, numberOf, tableFloor, tableOf } from './testUtils';

describeSkill(tabelleSkill, { minDistinct: 40 });

describe('daten.tabelle', () => {
  it('Stufe 1: at most 5 rows, values up to 100, and the answer stands in the asked row', () => {
    for (const ex of atLevel(tabelleSkill, 1, 1)) {
      const t = tableOf(ex);
      expect(t.rows.length).toBeLessThanOrEqual(5);
      t.rows.forEach((r) => expect(Number(r[1])).toBeLessThanOrEqual(100));
      const row = t.rows.find((r) => ex.prompt.includes(r[0]))!;
      expect(numberOf(ex)).toBe(Number(row[1]));
    }
  });

  it('Stufe 2: two value columns; column totals recomputed', () => {
    for (const ex of atLevel(tabelleSkill, 2, 3)) {
      const t = tableOf(ex);
      expect(t.header.length).toBe(3);
      if (formOf(ex) !== 'spaltensumme') continue;
      const totals = [1, 2].map((c) => t.rows.reduce((a, r) => a + Number(r[c]), 0));
      expect(totals).toContain(numberOf(ex));
    }
  });

  it('Stufe 3: an empty field is the total minus the known part', () => {
    const gaps = atLevel(tabelleSkill, 3, 2).filter((ex) => formOf(ex) === 'luecke');
    expect(gaps.length).toBeGreaterThan(20);
    for (const ex of gaps) {
      const [first, second, total] = tableOf(ex).rows;
      expect(total[0]).toBe('zusammen');
      const known = first[1] === '□' ? Number(second[1]) : Number(first[1]);
      expect([first[1], second[1]]).toContain('□');
      expect(numberOf(ex)).toBe(Number(total[1]) - known);
    }
  });

  it('every table fits a 375 px phone: the columns a task needs, also "zusammen", are in view without scrolling', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        // 16 px spare: bold row labels are wider than the estimate (measured in Chrome).
        for (const ex of atLevel(tabelleSkill, stufe, ab, 200)) expect(tableFloor(tableOf(ex)) + 16, `${ex.key}: ${tableOf(ex).header.join()}`).toBeLessThanOrEqual(CARD_PX);
      }
    }
  });

  it('short column heads are named in full in the caption, so "Mo" and "Ost" have a meaning', () => {
    for (const ex of [...atLevel(tabelleSkill, 2, 1), ...atLevel(tabelleSkill, 2, 3)]) expect(tableOf(ex).caption, ex.key).toMatch(/: (am|an) .+ und (am|an) /);
  });

  it('a bug hint speaks of plus, not of a Summe (T11)', () => {
    const open = atLevel(tabelleSkill, 3, 3, 300).filter((ex) => formOf(ex) === 'nicht-loesbar');
    expect(open.length).toBeGreaterThan(30);
    for (const ex of open) for (const b of ex.bugs!) expect(b.hint, ex.key).not.toMatch(/Summe/);
  });

  it('Stufe 3: a question about a missing column is "nicht lösbar"; the button also stands on solvable items', () => {
    const items = [...atLevel(tabelleSkill, 3, 2), ...atLevel(tabelleSkill, 3, 3)].filter((ex) => ex.answer.kind === 'number');
    const open = items.filter((ex) => ex.answer.kind === 'number' && ex.answer.value === null);
    expect(open.length).toBeGreaterThan(10);
    expect(items.length).toBeGreaterThan(open.length);
    for (const ex of items) expect(ex.answer.kind === 'number' && ex.answer.offerUnsolvable).toBe(true);
    for (const ex of open) for (const h of tableOf(ex).header) expect(ex.prompt.includes(h) && h !== tableOf(ex).header[0]).toBe(false);
  });

  it('the numbers fit the columns: cells up to 60 stand under schools, days and times, never under a class', () => {
    for (const ex of allLevels(tabelleSkill)) {
      if (ex.visual?.type === 'table') expect(ex.visual.header.join(), ex.key).not.toMatch(/Klasse/);
      expect(JSON.stringify([ex.prompt, ex.context, ex.steps]), ex.key).not.toMatch(/Klasse [A-C]/);
    }
  });

  it('a difference is never 1, so the sentence and the unit of the answer stay in the plural', () => {
    expect(agreementProblems(tabelleSkill)).toEqual([]);
    for (const ex of allLevels(tabelleSkill).filter((e) => ['mehr', 'zeile', 'spalte'].includes(formOf(e)))) expect(numberOf(ex), ex.key).toBeGreaterThanOrEqual(2);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(tabelleSkill)).toEqual([]);
    expect(fachwortOverreach(tabelleSkill)).toEqual([]);
  });

  it('offers "nicht lösbar" on Stufe 3 only', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atLevel(tabelleSkill, stufe, ab, 60)) expect(ex.answer.kind === 'number' && ex.answer.offerUnsolvable).toBeFalsy();
      }
    }
  });
});
