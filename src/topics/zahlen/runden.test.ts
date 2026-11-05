import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { rundenSkill } from './runden';
import { ZELLEN, bugValue, expectScope, kindOf, samplesIn, samplesOf, solutionProblems, stepText } from './testHelp';

describeSkill(rundenSkill);

const auf = (text: string) => (/Hunderter/.test(text) ? 100 : 10);
/** Rounding with 5 upwards, computed apart from the generator. */
function gerundet(n: number, p: number): number {
  const rest = n % p;
  return rest >= p / 2 ? n - rest + p : n - rest;
}
const number = (ex: Exercise) => (ex.answer as AnswerOf<'number'>).value!;
const correctLabel = (ex: Exercise) => {
  const a = ex.answer as AnswerOf<'choice'>;
  return a.options[a.correct].label;
};

function pruefe(ex: Exercise) {
  if (kindOf(ex) === 'runden') {
    const n = Number(ex.expression!.split(' ')[0]);
    expect(number(ex)).toBe(gerundet(n, auf(ex.prompt)));
    return n;
  }
  if (kindOf(ex) === 'naeher') {
    const n = Number(/\d+/.exec(ex.prompt)![0]);
    expect(Number(correctLabel(ex))).toBe(gerundet(n, auf(ex.prompt)));
    return n;
  }
  return null;
}

describe('zahlen.runden', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(rundenSkill, {
      1: { 1: ['naeher', 'runden'], 2: ['runden'], 3: ['runden'] },
      2: { 1: ['naeher', 'runden'], 2: ['runden'], 3: ['runden'] },
      3: { 1: ['runden'], 2: ['runden', 'welche'], 3: ['grenze', 'welche'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(rundenSkill)).toEqual([]);
  });

  it('Stufe 1: to tens at every AB level, and the result stays in the same hundred', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(rundenSkill, 1, ab, 300)) {
        const n = pruefe(ex)!;
        expect(auf(ex.prompt)).toBe(10);
        expect(n % 10).not.toBe(0);
        expect(Math.floor(gerundet(n, 10) / 100), ex.key).toBe(Math.floor(n / 100));
      }
    }
  });

  it('Stufe 1: AB I clear Einer, AB II any but the 5, both with the section; AB III exactly halfway or at a hundred, without it', () => {
    for (const ex of samplesOf(rundenSkill, 1, 1)) {
      expect([1, 2, 8, 9]).toContain(pruefe(ex)! % 10);
      expect(ex.visual?.type, ex.key).toBe('numberLine');
    }
    for (const ex of samplesOf(rundenSkill, 1, 2)) {
      expect(pruefe(ex)! % 10).not.toBe(5);
      expect(ex.visual?.type, ex.key).toBe('numberLine');
    }
    let mitte = 0;
    for (const ex of samplesOf(rundenSkill, 1, 3, 300)) {
      const n = pruefe(ex)!;
      expect(ex.visual, ex.key).toBeUndefined();
      const z = Math.floor(n / 10) % 10;
      expect(n % 10 === 5 || z === 9 || z === 0, ex.key).toBe(true);
      if (n % 10 === 5) mitte++;
    }
    expect(mitte).toBeGreaterThan(50);
  });

  it('Stufe 2: to hundreds at every AB level, without a picture in the task', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(rundenSkill, 2, ab, 300)) {
        pruefe(ex);
        expect(auf(ex.prompt)).toBe(100);
        expect(ex.visual, ex.key).toBeUndefined();
      }
    }
  });

  it('Stufe 2: AB I clear Zehner, AB II Zehner close to the middle, AB III the trap of rounding twice; the bugs compute', () => {
    const z = (n: number) => Math.floor(n / 10) % 10;
    for (const ex of samplesOf(rundenSkill, 2, 1)) expect([0, 1, 2, 7, 8, 9]).toContain(z(pruefe(ex)!));
    let kette = 0;
    for (const ex of samplesOf(rundenSkill, 2, 2, 300)) {
      const n = pruefe(ex)!;
      expect([3, 4, 5, 6]).toContain(z(n));
      const r10 = gerundet(n, 10);
      if (r10 !== number(ex) && r10 !== n) expect(bugValue(ex, 'runden-stelle')).toEqual([r10]);
      if (n % 100 >= 45 && n % 100 < 50) {
        kette++;
        expect(bugValue(ex, 'runden-kette')).toEqual([number(ex) + 100]);
      }
    }
    expect(kette).toBeGreaterThan(0);
    let falle = 0;
    for (const ex of samplesOf(rundenSkill, 2, 3, 300)) {
      const n = pruefe(ex)!;
      expect(n % 100, ex.key).toBeGreaterThanOrEqual(45);
      expect(n % 100, ex.key).toBeLessThan(55);
      if (n % 100 < 50) {
        falle++;
        expect(bugValue(ex, 'runden-kette')).toEqual([number(ex) + 100]);
      }
    }
    expect(falle).toBeGreaterThan(100);
  });

  it('Stufe 3, AB I and II: every rounding crosses a hundred; 396 gives the bugs 300 and 3100', () => {
    let seen = 0;
    let tausend = 0;
    for (const ex of samplesIn(rundenSkill, [[3, 1], [3, 2]], 300)) {
      const n = pruefe(ex);
      if (n === null) continue;
      expect(Math.floor(number(ex) / 100), ex.key).toBe(Math.floor(n / 100) + 1);
      if (auf(ex.prompt) === 10) {
        seen++;
        const h = Math.floor(n / 100);
        expect(bugValue(ex, 'runden-uebergang')).toEqual([h * 100, Number(`${h}100`)]);
      } else {
        tausend++;
        expect(number(ex)).toBe(1000);
      }
    }
    expect(seen).toBeGreaterThan(20);
    expect(tausend).toBeGreaterThan(20);
    for (const ex of samplesOf(rundenSkill, 3, 1)) {
      expect(auf(ex.prompt)).toBe(10);
      expect(pruefe(ex)! % 10, 'AB I keeps away from the middle').toBeGreaterThan(5);
    }
  });

  it('which number rounds to the target: exactly one option does; Stufe 3 alone asks this', () => {
    for (const [ab, p] of [[2, 10], [3, 100]] as const) {
      let seen = 0;
      for (const ex of samplesOf(rundenSkill, 3, ab, 300)) {
        if (kindOf(ex) !== 'welche') continue;
        seen++;
        expect(auf(ex.prompt)).toBe(p);
        const ziel = Number(/ergibt (\d+)/.exec(ex.prompt)![1]);
        const passt = (ex.answer as AnswerOf<'choice'>).options.filter((o) => gerundet(Number(o.label), p) === ziel);
        expect(passt.map((o) => o.label)).toEqual([correctLabel(ex)]);
      }
      expect(seen).toBeGreaterThan(50);
    }
  });

  it('the border: the answer rounds to the target, and one step further does not', () => {
    for (const ex of samplesOf(rundenSkill, 3, 3, 300)) {
      if (kindOf(ex) !== 'grenze') continue;
      const ziel = Number(/ist (\d+)/.exec(ex.prompt)![1]);
      const v = number(ex);
      expect(gerundet(v, 10)).toBe(ziel);
      expect(gerundet(/größte/.test(ex.prompt) ? v + 1 : v - 1, 10)).not.toBe(ziel);
    }
  });

  it('a hint about the nearer ten or hundred is true: exactly halfway it names the rule instead', () => {
    let genauMitte = 0;
    for (const ex of samplesIn(rundenSkill, ZELLEN, 150)) {
      if (kindOf(ex) !== 'runden') continue;
      const n = Number(ex.expression!.split(' ')[0]);
      const p = auf(ex.prompt);
      const rest = n % p;
      for (const b of ex.bugs ?? []) {
        if (/näher am nächsten/.test(b.hint)) expect(2 * rest, `${ex.key}: ${b.hint}`).toBeGreaterThan(p);
        if (/näher am \p{L}+ davor/u.test(b.hint)) expect(2 * rest, `${ex.key}: ${b.hint}`).toBeLessThan(p);
      }
      if (2 * rest === p) {
        genauMitte++;
        const wort = p === 10 ? 'Einern' : 'Zehnern';
        expect((ex.bugs ?? []).find((b) => b.match === n - rest)?.hint, ex.key).toBe(`Bei 5 ${wort} rundest du auf.`);
      }
    }
    expect(genauMitte).toBeGreaterThan(20);
  });

  it('the limit: the first step is a true sentence about that number, with the verb split', () => {
    let seen = 0;
    for (const ex of samplesOf(rundenSkill, 3, 3, 300)) {
      if (kindOf(ex) !== 'grenze') continue;
      seen++;
      const m = /^(\d+) rundest du auf (\d+) (auf|ab)\.$/.exec(stepText(ex.steps[0]))!;
      expect(m, stepText(ex.steps[0])).not.toBeNull();
      const v = Number(m[1]);
      expect(v).toBe(number(ex));
      expect(gerundet(v, 10)).toBe(Number(m[2]));
      expect(m[3]).toBe(v < Number(m[2]) ? 'auf' : 'ab');
    }
    expect(seen).toBeGreaterThan(30);
  });
});
