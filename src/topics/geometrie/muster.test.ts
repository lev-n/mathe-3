import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { canonicalId } from './hexomino';
import { musterSkill } from './muster';

describeSkill(musterSkill, { minDistinct: { 1: 40, 2: 40, 3: 40 } });

type Grid = Extract<Visual, { type: 'grid' }>;

/** The cells of piece i of a band with pieces w wide and one empty column between. */
function pieceOf(v: Grid, i: number, w: number): string {
  const from = i * (w + 1);
  return v.cells.filter(([x]) => x >= from && x < from + w).map(([x, y]) => `${x - from}.${y}`).sort().join('-');
}

describe('Bandornamente: answers recomputed', () => {
  it('the next tile of a row follows its period', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(musterSkill, stufe)) {
        if (!ex.key.includes(':reihe:') || ex.answer.kind !== 'choice' || ex.visual?.type !== 'shapeRow') continue;
        const items = ex.visual.items;
        const shown = items.length - 1;
        const period = ex.key.split(':')[3].split('-').length;
        const right = (ex.answer.options[ex.answer.correct].visual as Extract<Visual, { type: 'shapeRow' }>).items[0];
        expect(right, ex.key).toEqual(items[shown % period]);
        expect(items[shown].shape, ex.key).toBeUndefined();
      }
    }
  });

  it('a painted band repeats its columns all the way', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(musterSkill, stufe)) {
        if (ex.answer.kind !== 'cells') continue;
        const period = Number(ex.key.split(':')[3]);
        const all = [...ex.answer.given, ...ex.answer.solution];
        const set = new Set(all.map((c) => c.join()));
        for (const [x, y] of all) if (x + period < ex.answer.width) expect(set.has([x + period, y].join()), ex.key).toBe(true);
        expect(ex.answer.width).toBeLessThanOrEqual(6);
        expect(ex.answer.height).toBeLessThanOrEqual(6);
      }
    }
  });

  it('the next piece follows the rule of the band', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(musterSkill, stufe)) {
        if (!ex.key.includes(':naechstes:') || ex.answer.kind !== 'choice') continue;
        const v = ex.visual as Grid;
        const mirrored = ex.key.includes(':gespiegelt:');
        const shown = Number(ex.key.split(':')[4]);
        const right = ex.answer.options[ex.answer.correct].visual as Grid;
        const b = right.cells.map(([x, y]) => [x - 1, y - 1]);
        const id = b.map(([x, y]) => `${x}.${y}`).sort().join('-');
        const expected = mirrored ? pieceOf(v, shown % 2 === 1 ? 1 : 0, 2) : pieceOf(v, 0, 2);
        expect(id, ex.key).toBe(expected);
      }
    }
  });

  it('exactly the named piece breaks the rule', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(musterSkill, stufe)) {
        if (!ex.key.includes(':fehlerteil:') || ex.answer.kind !== 'choice') continue;
        const v = ex.visual as Grid;
        const at = Number(ex.key.split(':')[4]);
        const mirrored = ex.key.includes(':gespiegelt:');
        const count = 5;
        for (let i = 0; i < count; i++) {
          const fits = pieceOf(v, i, 2) === pieceOf(v, mirrored ? i % 2 : 0, 2);
          expect(fits, `${ex.key} piece ${i}`).toBe(i !== at);
        }
        expect(ex.answer.options[ex.answer.correct].label).toBe(`Teil ${at + 1}`);
      }
    }
  });

  it('only the named piece can be the wrong one, whichever rule of period 1 or 2 a child reads into the band', () => {
    const seen = new Set<string>();
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(musterSkill, stufe, 1000)) {
        if (!ex.key.includes(':fehlerteil:') || ex.answer.kind !== 'choice') continue;
        const v = ex.visual as Grid;
        const count = ex.answer.options.length;
        const pieces = Array.from({ length: count }, (_, i) => pieceOf(v, i, 2));
        const repairs = pieces.flatMap((_, skip) => {
          const others = pieces.map((p, i) => ({ p, i })).filter((o) => o.i !== skip);
          const fits = (period: number) => others.every((a) => others.every((b) => a.i % period !== b.i % period || a.p === b.p));
          return fits(1) || fits(2) ? [skip] : [];
        });
        expect(repairs, ex.key).toEqual([ex.answer.correct]);
        seen.add(ex.key.split(':')[3]);
      }
    }
    expect([...seen].sort()).toEqual(['gespiegelt', 'verschoben']);
  });

  it('a painted band shows its rule: at least two periods, or all but the last column', () => {
    const seen = new Set<number>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(musterSkill, stufe, 500)) {
        if (ex.answer.kind !== 'cells') continue;
        const period = Number(ex.key.split(':')[3]);
        seen.add(period);
        const shown = Math.max(...ex.answer.given.map(([x]) => x)) + 1;
        expect(shown, ex.key).toBe(Math.min(2 * period, ex.answer.width - 1));
        // no shorter rule fits the given columns
        const col = (x: number) => (ex.answer as { given: Cell[] }).given.filter((c) => c[0] === x).map((c) => c[1]).join();
        for (let p = 1; p < period; p++) expect(Array.from({ length: shown - p }, (_, x) => col(x) === col(x + p)).every(Boolean), ex.key).toBe(false);
      }
    }
    expect([...seen].sort()).toEqual([2, 3]);
  });

  it('Parkett: a real turn makes the right piece fit, without flipping it over', () => {
    const turn = (cells: readonly Cell[]): Cell[] => cells.map(([x, y]) => [-y, x] as Cell);
    const id = (cells: readonly Cell[]) => {
      const minX = Math.min(...cells.map((c) => c[0]));
      const minY = Math.min(...cells.map((c) => c[1]));
      return cells.map(([x, y]) => `${x - minX}.${y - minY}`).sort().join('-');
    };
    let checked = 0;
    for (const ex of samples(musterSkill, 3, 1500)) {
      if (!ex.key.includes(':parkett:') || ex.answer.kind !== 'choice') continue;
      const v = ex.visual as Grid;
      const filled = new Set(v.cells.map((c) => c.join()));
      const gap: Cell[] = [];
      for (let y = 0; y < v.height; y++) for (let x = 0; x < v.width; x++) if (!filled.has([x, y].join())) gap.push([x, y]);
      let piece = (ex.answer.options[ex.answer.correct].visual as Grid).cells;
      const turns = new Set<string>();
      for (let i = 0; i < 4; i++) {
        turns.add(id(piece));
        piece = turn(piece);
      }
      expect(turns.has(id(gap)), ex.key).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('Parkett: the right piece has the form of the gap, the others not', () => {
    for (const ex of samples(musterSkill, 3)) {
      if (!ex.key.includes(':parkett:') || ex.answer.kind !== 'choice') continue;
      const v = ex.visual as Grid;
      const filled = new Set(v.cells.map((c) => c.join()));
      const gap: Cell[] = [];
      for (let y = 0; y < v.height; y++) for (let x = 0; x < v.width; x++) if (!filled.has([x, y].join())) gap.push([x, y]);
      const gapId = canonicalId(gap);
      ex.answer.options.forEach((o, i) => {
        const id = canonicalId((o.visual as Grid).cells);
        if (i === (ex.answer as { correct: number }).correct) expect(id, ex.key).toBe(gapId);
        else expect(id, ex.key).not.toBe(gapId);
      });
    }
  });
});
