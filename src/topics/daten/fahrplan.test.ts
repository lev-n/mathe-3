import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { fahrplanSkill, WAREN } from './fahrplan';
import { agreementProblems, allLevels, atLevel, correctLabel, fachwortOverreach, formOf, longTasks, numberOf, tableOf, topShare } from './testUtils';

describeSkill(fahrplanSkill, { minDistinct: 40 });

/** '8.45' → minutes since midnight. */
const minutes = (cell: string) => {
  const [h, m] = cell.split('.').map(Number);
  return h * 60 + m;
};

describe('daten.fahrplan', () => {
  it('Stufe 1: 3 rows; a price is read from the asked row', () => {
    const prices = atLevel(fahrplanSkill, 1, 1).filter((e) => formOf(e) === 'preis');
    expect(prices.length).toBeGreaterThan(30);
    for (const ex of prices) {
      const t = tableOf(ex);
      expect(t.rows.length).toBe(3);
      const row = t.rows.find((r) => ex.prompt.includes(r[0]))!;
      expect(numberOf(ex).toFixed(2).replace('.', ',')).toBe(row[1].split(' ')[0]);
    }
  });

  it('Stufe 2: the bus that arrives first has the earliest Ankunft; with the trap it does not leave first', () => {
    for (const ab of [1, 3] as const) {
      for (const ex of atLevel(fahrplanSkill, 2, ab).filter((e) => formOf(e).startsWith('ankunft'))) {
        const rows = tableOf(ex).rows;
        const first = [...rows].sort((a, b) => minutes(a[2]) - minutes(b[2]))[0];
        expect(correctLabel(ex)).toBe(first[0]);
        const leavesFirst = [...rows].sort((a, b) => minutes(a[1]) - minutes(b[1]))[0];
        if (formOf(ex) === 'ankunft-trick') expect(first[0]).not.toBe(leavesFirst[0]);
        else expect(first[0]).toBe(leavesFirst[0]);
      }
    }
  });

  it('Stufe 2: a total from the Preisliste is recomputed from the list', () => {
    const items = [...atLevel(fahrplanSkill, 2, 2), ...atLevel(fahrplanSkill, 2, 3)].filter((e) => ['zwei', 'doppelt'].includes(formOf(e)));
    expect(items.length).toBeGreaterThan(50);
    for (const ex of items) {
      const prices = new Map(tableOf(ex).rows.map((r) => [r[0], Math.round(Number(r[1].split(' ')[0].replace(',', '.')) * 100)]));
      const parts = ex.key.split(':');
      const names = parts[3].split('-');
      const [p, q] = [Number(parts[5]), Number(parts[6])];
      const factor = formOf(ex) === 'doppelt' ? 2 : 1;
      expect(Math.round(numberOf(ex) * 100)).toBe(factor * prices.get(names[p])! + prices.get(names[q])!);
    }
  });

  it('every ware keeps a price that fits it: fruit stays cheaper than a muffin, and no two wares cost the same', () => {
    const items = allLevels(fahrplanSkill).filter((e) => e.visual?.type === 'table' && e.visual.header[0] === 'Ware');
    expect(items.length).toBeGreaterThan(50);
    for (const ex of items) {
      const prices = tableOf(ex).rows.map((r) => [r[0], Math.round(parseFloat(r[1].replace(',', '.')) * 100)] as const);
      expect(new Set(prices.map((p) => p[1])).size, ex.key).toBe(prices.length);
      for (const [label, cent] of prices) {
        const ware = WAREN.find((w) => w.label === label)!;
        expect(cent, `${ex.key}: ${label}`).toBeGreaterThanOrEqual(ware.lo);
        expect(cent, `${ex.key}: ${label}`).toBeLessThanOrEqual(ware.hi);
      }
    }
    const ware = (label: string) => WAREN.find((w) => w.label === label)!;
    expect(ware('Apfel').hi).toBeLessThan(ware('Muffin').lo);
    expect(ware('Banane').hi).toBeLessThan(ware('Muffin').lo);
  });

  it('a count of 1 stands in the singular, also for a Minute', () => {
    expect(agreementProblems(fahrplanSkill)).toEqual([]);
  });

  it('Stufe 3: the travel time is Ankunft minus Abfahrt, within 60 minutes', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atLevel(fahrplanSkill, 3, ab).filter((e) => e.answer.kind === 'number')) {
        const row = tableOf(ex).rows.find((r) => ex.prompt.includes(r[0]))!;
        const d = minutes(row[2]) - minutes(row[1]);
        expect(numberOf(ex)).toBe(d);
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(60);
      }
    }
  });

  it('Stufe 3: the shortest trip: every bus passes the full hour, so the hint fits, and the answer is recomputed', () => {
    const items = atLevel(fahrplanSkill, 3, 3, 800).filter((e) => formOf(e) === 'kuerzeste');
    expect(items.length).toBeGreaterThan(100);
    for (const ex of items) {
      const rows = tableOf(ex).rows;
      for (const r of rows) {
        const [dep, arr] = [minutes(r[1]), minutes(r[2])];
        expect(Math.floor(dep / 60), ex.key).toBeLessThan(Math.floor(arr / 60));
        expect(arr % 60, ex.key).toBeGreaterThan(0);
        expect(arr - dep, ex.key).toBeLessThanOrEqual(60);
      }
      const shortest = [...rows].sort((a, b) => minutes(a[2]) - minutes(a[1]) - (minutes(b[2]) - minutes(b[1])))[0];
      expect(correctLabel(ex), ex.key).toBe(shortest[0]);
      expect(rows.map((r) => minutes(r[1])), ex.key).toEqual(rows.map((r) => minutes(r[1])).sort((a, b) => a - b));
    }
    expect(topShare(items.map(correctLabel)), 'no bus letter means "shortest"').toBeLessThan(0.45);
  });

  it('T1 and T11: at most 15 words to read, and no word that needs a definition card', () => {
    expect(longTasks(fahrplanSkill)).toEqual([]);
    expect(fachwortOverreach(fahrplanSkill)).toEqual([]);
  });

  it('Stufe 3: over the full hour, the decimal subtraction is recognised (8.45 to 9.10 as 65)', () => {
    const items = atLevel(fahrplanSkill, 3, 2);
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const row = tableOf(ex).rows.find((r) => ex.prompt.includes(r[0]))!;
      const asDecimal = (c: string) => Number(c.replace('.', ''));
      expect(ex.bugs!.find((b) => b.id === 'fahrplan-spanne')?.match).toBe(asDecimal(row[2]) - asDecimal(row[1]));
    }
  });
});
