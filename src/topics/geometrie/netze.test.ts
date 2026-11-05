import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell, Exercise, Visual } from '../../core/types';
import { samples } from '../test-utils';
import { bounds, cellSet, ck } from './grid';
import { canonicalId, hexominoes, isCubeNet } from './hexomino';
import { completions, netzeSkill } from './netze';

describeSkill(netzeSkill, { minDistinct: { 1: 40, 2: 60, 3: 60 } });

/** The 11 nets of the cube, written out row by row (independent of the folding simulation). */
const ELEVEN = [
  ['x...', 'xxxx', 'x...'],
  ['x...', 'xxxx', '.x..'],
  ['x...', 'xxxx', '..x.'],
  ['x...', 'xxxx', '...x'],
  ['.x..', 'xxxx', '.x..'],
  ['.x..', 'xxxx', '..x.'],
  ['xx..', '.xxx', '.x..'],
  ['xx..', '.xxx', '..x.'],
  ['xx..', '.xxx', '...x'],
  ['xx..', '.xx.', '..xx'],
  ['xxx..', '..xxx'],
].map((rows) => rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === 'x' ? [[x, y] as Cell] : []))));

const netCells = (ex: Exercise) => (ex.visual as Extract<Visual, { type: 'net' }>).cells;

describe('Würfelnetze: answers recomputed', () => {
  it('the simulation finds exactly the 11 known nets among 35 hexominoes', () => {
    expect(hexominoes()).toHaveLength(35);
    const found = hexominoes().filter((h) => h.net).map((h) => canonicalId(h.cells)).sort();
    expect(found).toEqual(ELEVEN.map(canonicalId).sort());
  });

  it('Ja stands for a net and Nein for a non-net', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(netzeSkill, stufe)) {
        if (!ex.key.includes(':ist-netz:') || ex.answer.kind !== 'choice') continue;
        const known = ELEVEN.map(canonicalId).includes(canonicalId(netCells(ex)));
        expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(known ? 'Ja' : 'Nein');
      }
    }
  });

  it('a picture task has exactly one net, or exactly one non-net', () => {
    const known = new Set(ELEVEN.map(canonicalId));
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(netzeSkill, stufe)) {
        if (ex.answer.kind !== 'choice') continue;
        const options = ex.answer.options;
        const isNet = (i: number) => known.has(canonicalId((options[i].visual as Extract<Visual, { type: 'net' }>).cells));
        if (ex.key.includes(':waehlen:')) expect(ex.answer.options.filter((_, i) => isNet(i)).map((o) => o.label), ex.key).toEqual([ex.answer.options[ex.answer.correct].label]);
        if (ex.key.includes(':kein-netz:')) expect(ex.answer.options.filter((_, i) => !isNet(i)).map((o) => o.label), ex.key).toEqual([ex.answer.options[ex.answer.correct].label]);
      }
    }
  });

  it('a square to fill is the only completion on its field', () => {
    expect(completions().length).toBeGreaterThan(20);
    const known = new Set(ELEVEN.map(canonicalId));
    for (const c of completions()) {
      const taken = cellSet(c.given);
      const fits: string[] = [];
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (!taken.has(ck([x, y])) && known.has(canonicalId([...c.given, [x, y]]))) fits.push(ck([x, y]));
      expect(fits).toEqual([ck(c.missing)]);
      expect(isCubeNet([...c.given, c.missing])).toBe(true);
      expect(c.width).toBeLessThanOrEqual(6);
      expect(c.height).toBeLessThanOrEqual(6);
    }
  });

  it('opposite faces: the feedback states no rule about the faces between', () => {
    for (const ex of samples(netzeSkill, 3, 1500)) {
      if (!ex.key.includes(':gegenueber:') || ex.answer.kind !== 'choice') continue;
      const v = ex.visual as Extract<Visual, { type: 'net' }>;
      const asked = v.highlight![0];
      for (const o of ex.answer.options) {
        if (!o.whyWrong) continue;
        expect(o.whyWrong, ex.key).not.toContain('dazwischen');
        const at = v.faces!.indexOf(o.label);
        const neighbour = Math.abs(v.cells[at][0] - v.cells[asked][0]) + Math.abs(v.cells[at][1] - v.cells[asked][1]) === 1;
        expect(o.whyWrong.includes('nebeneinander'), ex.key).toBe(neighbour);
      }
    }
  });

  it('Spielwürfel: the number completes its opposite to 7', () => {
    // straight rows: the row of four has opposites at distance 2
    for (const ex of samples(netzeSkill, 3)) {
      if (!ex.key.includes(':spielwuerfel:') || ex.answer.kind !== 'number') continue;
      const v = ex.visual as Extract<Visual, { type: 'net' }>;
      const value = ex.answer.value as number;
      const shown = v.faces!.flatMap((f) => (f && f !== '?' ? [Number(f)] : []));
      expect(shown).toHaveLength(5);
      expect([...shown, value].sort()).toEqual([1, 2, 3, 4, 5, 6]);
      // in a row of three neighbours the outer two are opposite
      const at = (x: number, y: number) => v.cells.findIndex((c) => c[0] === x && c[1] === y);
      for (const [x, y] of v.cells) {
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const [m, e, s] = [at(x + dx, y + dy), at(x + 2 * dx, y + 2 * dy), at(x, y)];
          if (m < 0 || e < 0) continue;
          const nums = [v.faces![s], v.faces![e]].map((f) => (f === '?' ? value : Number(f)));
          expect(nums[0] + nums[1], ex.key).toBe(7);
        }
      }
    }
  });

  it('Quadernetze stay within the picture and pair equal faces', () => {
    const OPP: Record<string, string> = { A: 'C', C: 'A', B: 'D', D: 'B', E: 'F', F: 'E' };
    for (const ex of samples(netzeSkill, 3)) {
      if (!ex.key.includes(':quader-')) continue;
      if (ex.key.includes(':quader-netz:')) continue;
      const v = ex.visual as Extract<Visual, { type: 'net' }>;
      expect(v.cells.length).toBeLessThanOrEqual(16);
      const size = (l: string) => v.faces!.filter((f) => f === l).length;
      for (const l of Object.keys(OPP)) expect(size(l), ex.key).toBe(size(OPP[l]));
      expect(size('A') + size('B') + size('C') + size('D') + size('E') + size('F')).toBe(v.cells.length);
      const b = bounds(v.cells);
      expect(b.minX).toBe(0);
      expect(b.minY).toBe(0);
    }
  });
});
