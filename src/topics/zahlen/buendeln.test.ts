import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise, VisualOf } from '../../core/types';
import BaseTenVisual from '../../ui/visuals/BaseTenVisual';
import { buendelnSkill } from './buendeln';
import { all, bugValue, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';

describeSkill(buendelnSkill);

const number = (ex: Exercise) => (ex.answer as AnswerOf<'number'>).value;
const felder = (ex: Exercise) => (ex.answer as AnswerOf<'multi'>).fields.map((f) => f.value);
const WERT = { Einer: 1, Zehner: 10, Hunderter: 100, Tausender: 1000 };

function bild(ex: Exercise) {
  if (ex.visual?.type !== 'baseTen') throw new Error(`${ex.key} without a picture`);
  return { h: ex.visual.hundreds!, z: ex.visual.tens, e: ex.visual.ones };
}

/** '30 Zehner = □ Hunderter' as its two sides. */
function regelSeiten(ex: Exercise) {
  const m = /^(\d+) (\p{L}+) = □ (\p{L}+)$/u.exec(ex.expression!)!;
  return { links: Number(m[1]), klein: WERT[m[2] as keyof typeof WERT], gross: WERT[m[3] as keyof typeof WERT] };
}

describe('zahlen.buendeln', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(buendelnSkill, {
      1: { 1: ['bild'], 2: ['bild', 'stellen'], 3: ['bildwahl'] },
      2: { 1: ['regel'], 2: ['gemischt', 'multi'], 3: ['doppelt', 'fehlt'] },
      3: { 1: ['alszehner', 'regel'], 2: ['alszehner', 'bistausend', 'wenigste'], 3: ['tauschen', 'tausend', 'wenigste1000'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(buendelnSkill)).toEqual([]);
  });

  it('Stufe 1: no item bundles, and AB raises the demand from reading to the empty place to choosing the picture', () => {
    for (const ex of samplesOf(buendelnSkill, 1, 1)) {
      const { h, z, e } = bild(ex);
      expect([h, z, e]).not.toContain(0);
      expect(number(ex)).toBe(100 * h + 10 * z + e);
    }
    let leer = 0;
    for (const ex of samplesOf(buendelnSkill, 1, 2)) {
      const { h, z, e } = bild(ex);
      expect(z).toBeLessThanOrEqual(9);
      expect(e).toBeLessThanOrEqual(9);
      if (kindOf(ex) === 'stellen') {
        expect(felder(ex)).toEqual([h, z, e]);
      } else {
        leer++;
        expect(number(ex)).toBe(100 * h + 10 * z + e);
        expect([z, e].filter((d) => d === 0).length, ex.key).toBe(1);
        expect(ex.srText, ex.key).not.toMatch(/(?<!\d)0 /);
      }
    }
    expect(leer).toBeGreaterThan(30);
    for (const ex of samplesOf(buendelnSkill, 1, 3)) {
      const a = ex.answer as AnswerOf<'choice'>;
      expect(a.options.length).toBe(3);
      // the options stand one below the other on a phone: each picture stays within one line of plates and one of cubes
      for (const o of a.options) expect(Number(/height="(\d+)"/.exec(renderToStaticMarkup(createElement(BaseTenVisual, { visual: o.visual as VisualOf<'baseTen'> })))![1]), ex.key).toBeLessThanOrEqual(134);
      const shown = a.options[a.correct].visual;
      if (shown?.type !== 'baseTen') throw new Error('an option without a picture');
      expect(ex.prompt).toContain(String(100 * shown.hundreds! + 10 * shown.tens + shown.ones));
    }
  });

  it('Stufe 2, AB I: the rule bundles upwards only; unbundling belongs to Stufe 3', () => {
    for (const ex of samplesOf(buendelnSkill, 2, 1)) {
      const { links, klein, gross } = regelSeiten(ex);
      expect(links % 10, ex.key).toBe(0);
      expect(gross, ex.key).toBeGreaterThan(klein);
      expect(links * klein).toBe(number(ex)! * gross);
    }
  });

  it('Stufe 2, AB II: 3 H 14 Z computes to 440, and written as spoken to 3140', () => {
    let seen = 0;
    let leer = 0;
    for (const ex of samplesOf(buendelnSkill, 2, 2, 300)) {
      if (kindOf(ex) !== 'gemischt') continue;
      const [h, z, e] = ex.key.split(':').slice(3).map(Number);
      expect(number(ex)).toBe(100 * h + 10 * z + e);
      expect(z > 9 || e > 9).toBe(true);
      expect(bugValue(ex, 'buendeln')).toEqual([Number(`${h}${z}${e}`)]);
      expect(ex.visual).toMatchObject({ type: 'baseTen', hundreds: h, tens: z, ones: e });
      expect(ex.srText, ex.key).not.toMatch(/(?<!\d)0 /);
      if (ex.expression!.split(' ').length < 7) leer++;
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
    expect(leer).toBeGreaterThan(10);
  });

  it('Stufe 2, AB III: two places to bundle, or the number is given and the Hunderter are sought', () => {
    let doppelt = 0;
    let fehlt = 0;
    for (const ex of samplesOf(buendelnSkill, 2, 3, 300)) {
      if (kindOf(ex) === 'doppelt') {
        doppelt++;
        const { h, z, e } = bild(ex);
        expect(z).toBeGreaterThan(9);
        expect(e).toBeGreaterThan(9);
        expect(number(ex)).toBe(100 * h + 10 * z + e);
        expect(number(ex)).toBeLessThanOrEqual(1000);
      } else {
        fehlt++;
        const m = /^□ H (\d+) Z(?: (\d) E)? = (\d+)$/.exec(ex.expression!)!;
        const z = Number(m[1]);
        expect(z).toBeGreaterThan(9);
        expect(100 * number(ex)! + 10 * z + Number(m[2] ?? 0)).toBe(Number(m[3]));
        expect(bugValue(ex, 'buendeln')).toEqual([number(ex)! + 1]);
      }
    }
    expect(doppelt).toBeGreaterThan(50);
    expect(fehlt).toBeGreaterThan(50);
  });

  it('Stufe 3, AB I: full hundreds as Zehner and the rule downwards', () => {
    for (const ex of samplesOf(buendelnSkill, 3, 1)) {
      if (kindOf(ex) === 'alszehner') {
        const n = Number(ex.expression!.split(' ')[0]);
        expect(n % 100, ex.key).toBe(0);
        expect(number(ex)! * 10).toBe(n);
      } else {
        // read from the expression: here the left side is the larger place, '3 Hunderter = □ Zehner'
        const { links, klein: linkerWert, gross: rechterWert } = regelSeiten(ex);
        expect(rechterWert, ex.key).toBeLessThan(linkerWert);
        expect(links * linkerWert).toBe(number(ex)! * rechterWert);
        expect(ex.prompt).toMatch(/^Tausche/);
      }
    }
  });

  it('Stufe 3, AB II: Zehner of its own, the sticks missing up to 1000, the fewest blocks of a number', () => {
    for (const ex of samplesOf(buendelnSkill, 3, 2)) {
      const kind = kindOf(ex);
      if (kind === 'alszehner') {
        const n = Number(ex.expression!.split(' ')[0]);
        expect(n % 100, ex.key).not.toBe(0);
        expect(number(ex)! * 10).toBe(n);
      }
      if (kind === 'wenigste') {
        const n = Number(/\d+/.exec(ex.prompt)![0]);
        expect(number(ex)).toBe(Math.floor(n / 100) + (Math.floor(n / 10) % 10) + (n % 10));
      }
      if (kind === 'bistausend') expect(number(ex)).toBe(100 - 10 * bild(ex).h - bild(ex).z);
    }
  });

  it('Stufe 3, AB II and III hold no fixed item: every form has many tasks', () => {
    for (const ab of [2, 3] as const) {
      const keys = new Map<string, Set<string>>();
      for (const ex of samplesOf(buendelnSkill, 3, ab, 400)) keys.set(kindOf(ex), (keys.get(kindOf(ex)) ?? new Set()).add(ex.key));
      for (const [kind, set] of keys) expect(set.size, kind).toBeGreaterThanOrEqual(8);
    }
  });

  it('Stufe 3, AB III: the fewest blocks after a swap, the rest of 1000 in Zehner, the fewest blocks up to 1000', () => {
    for (const ex of samplesOf(buendelnSkill, 3, 3)) {
      const kind = kindOf(ex);
      if (kind === 'tausend') {
        const k = Number(/^1000 = (\d) H □ Z$/.exec(ex.expression!)![1]);
        expect(100 * k + 10 * number(ex)!).toBe(1000);
      }
      if (kind === 'wenigste1000') {
        const rest = 1000 - Number(/Von (\d+) bis/.exec(ex.prompt)![1]);
        expect(number(ex), ex.key).toBe(Math.floor(rest / 100) + (Math.floor(rest / 10) % 10) + (rest % 10));
      }
      if (kind === 'tauschen') {
        const { h, z, e } = bild(ex);
        expect(z).toBeGreaterThan(9);
        const n = 100 * h + 10 * z + e;
        expect(number(ex)).toBe(Math.floor(n / 100) + (Math.floor(n / 10) % 10) + (n % 10));
        expect(bugValue(ex, 'nicht-wenigste')).toEqual([h + z + e]);
      }
    }
  });

  it('a rule: no hint states the answer with its place, in either direction, and the screen reader gets words', () => {
    let seen = 0;
    for (const ex of samplesIn(buendelnSkill, [[2, 1], [3, 1]], 400)) {
      if (kindOf(ex) !== 'regel') continue;
      seen++;
      const gefragt = /□ (\p{L}+)$/u.exec(ex.expression!)![1];
      const antwort = new RegExp(`(?<!\\d)${number(ex)} ${gefragt}`);
      for (const hint of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(hint, ex.key).not.toMatch(antwort);
      expect(ex.srText, ex.key).not.toContain('□');
      expect(ex.srText, ex.key).toContain('Lücke');
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('the worked steps carry a Stellenwerttafel (§6: baseTen, placeValue), and bundling shows both rows', () => {
    const kinds = new Set<string>();
    for (const ex of all(buendelnSkill, 300)) {
      const tafeln = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual?.type === 'placeValue' ? [s.visual] : []));
      if (tafeln.length === 0) continue;
      kinds.add(kindOf(ex));
      expect(tafeln.length, ex.key).toBe(1);
      const rows = tafeln[0].rows.map((r) => r.values);
      if (kindOf(ex) === 'bild') expect(Number(rows[0].join('')), ex.key).toBe(number(ex));
      if (kindOf(ex) === 'gemischt' || kindOf(ex) === 'doppelt') {
        const [h, z, e] = ex.key.split(':').slice(3).map(Number);
        expect(rows[0], ex.key).toEqual([h, z, e]);
        expect(Number(rows[1].join('')), ex.key).toBe(number(ex));
        expect(rows[1].every((d) => d! <= 9), ex.key).toBe(true);
      }
      if (kindOf(ex) === 'multi') {
        const [h, z] = ex.key.split(':').slice(3).map(Number);
        expect(rows, ex.key).toEqual([[h, z], [h + 1, z - 10]]);
      }
    }
    expect([...kinds].sort()).toEqual(['alszehner', 'bild', 'bildwahl', 'doppelt', 'fehlt', 'gemischt', 'multi', 'stellen', 'wenigste', 'wenigste1000']);
  });

  it('bundling in fields: the task table holds the place with too many', () => {
    let seen = 0;
    for (const ex of samplesOf(buendelnSkill, 2, 2, 300)) {
      if (kindOf(ex) !== 'multi') continue;
      seen++;
      const [h, z] = ex.key.split(':').slice(3).map(Number);
      expect(felder(ex), ex.key).toEqual([h + 1, z - 10]);
      expect(ex.visual, ex.key).toEqual({ type: 'placeValue', columns: ['H', 'Z'], rows: [{ values: [h, z] }] });
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('uses different answer kinds', () => {
    expect(new Set(all(buendelnSkill, 100).map((ex) => ex.answer.kind))).toEqual(new Set(['number', 'multi', 'choice']));
  });
});
