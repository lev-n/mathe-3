import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise, Visual } from '../../core/types';
import { ZELLEN, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill);

/** The numbers in the rows of a Stellenwerttafel. */
function tafelZahlen(v: Visual | undefined): number[] {
  if (v?.type !== 'placeValue') throw new Error('no table');
  return v.rows.map((r) => Number(r.values.join('')));
}

const WERT: Record<string, number> = { H: 100, Z: 10, E: 1 };
/** '300 + 50 + 4', '3 H 5 Z 4 E' or '354' as a number. */
function wert(text: string): number {
  if (/[HZE]/.test(text)) return [...text.matchAll(/(\d) ([HZE])/g)].reduce((s, m) => s + Number(m[1]) * WERT[m[2]], 0);
  return text.split(' + ').map(Number).reduce((a, b) => a + b, 0);
}
const correctLabel = (ex: Exercise) => {
  const a = ex.answer as AnswerOf<'choice'>;
  return a.options[a.correct].label;
};
const hundert = (n: number) => Math.floor(n / 100);
const zehner = (n: number) => Math.floor(n / 10) % 10;

function pruefeZeichen(ex: Exercise) {
  const [links, rechts] = ex.expression!.split(' □ ');
  const a = wert(links);
  const b = wert(rechts);
  expect(correctLabel(ex)).toBe(a < b ? '<' : a > b ? '>' : '=');
  return [a, b];
}

describe('zahlen.vergleichen', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(vergleichenSkill, {
      1: { 1: ['welche', 'zeichen'], 2: ['zeichen'], 3: ['passend', 'zeichen'] },
      2: { 1: ['zeichen'], 2: ['zeichen'], 3: ['form'] },
      3: { 1: ['karten', 'ordnen'], 2: ['karten', 'ordnen'], 3: ['karten', 'ordnen'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(vergleichenSkill)).toEqual([]);
  });

  it('Stufe 1, AB I: different hundreds, and the larger number also has the larger digits behind', () => {
    for (const ex of samplesOf(vergleichenSkill, 1, 1)) {
      let [a, b] = kindOf(ex) === 'zeichen' ? pruefeZeichen(ex) : (ex.answer as AnswerOf<'choice'>).options.map((o) => Number(o.label));
      if (kindOf(ex) === 'welche') expect(Number(correctLabel(ex))).toBe(/größer/.test(ex.prompt) ? Math.max(a, b) : Math.min(a, b));
      if (a > b) [a, b] = [b, a];
      expect(hundert(a)).not.toBe(hundert(b));
      expect(b % 100, ex.key).toBeGreaterThan(a % 100);
    }
  });

  it('Stufe 1, AB II: different hundreds, with pairs like 289 and 301', () => {
    let fallen = 0;
    for (const ex of samplesOf(vergleichenSkill, 1, 2, 300)) {
      const [a, b] = pruefeZeichen(ex);
      expect(hundert(a)).not.toBe(hundert(b));
      if (Math.min(a, b) % 100 > Math.max(a, b) % 100) fallen++;
    }
    expect(fallen, 'pairs like 289 and 301').toBeGreaterThan(30);
  });

  it('Stufe 1, AB III: always the trap with neighbouring hundreds, or the number to choose for a sign', () => {
    let passend = 0;
    for (const ex of samplesOf(vergleichenSkill, 1, 3, 300)) {
      if (kindOf(ex) === 'zeichen') {
        const [a, b] = pruefeZeichen(ex);
        expect(Math.abs(hundert(a) - hundert(b)), ex.key).toBe(1);
        expect(Math.min(a, b) % 100, ex.key).toBeGreaterThan(Math.max(a, b) % 100);
      } else {
        passend++;
        const m = /^□ ([<>]) (\d+)$/.exec(ex.expression!)!;
        const n = Number(m[2]);
        const stimmt = (x: number) => (m[1] === '>' ? x > n : x < n);
        const a = ex.answer as AnswerOf<'choice'>;
        expect(a.options.filter((o) => stimmt(Number(o.label))).map((o) => o.label), ex.key).toEqual([correctLabel(ex)]);
        for (const o of a.options) expect(hundert(Number(o.label)), 'different hundreds, as on all of Stufe 1').not.toBe(hundert(n));
        expect(a.options.length).toBeLessThanOrEqual(4);
        expect(ex.srText).not.toContain('□');
      }
    }
    expect(passend).toBeGreaterThan(50);
  });

  it('Stufe 2: same hundreds at every AB level; AB I other Zehner, AB II swapped digits or other Einer, AB III another way of writing, with =', () => {
    for (const ex of samplesOf(vergleichenSkill, 2, 1)) {
      const [a, b] = pruefeZeichen(ex);
      expect(hundert(a)).toBe(hundert(b));
      expect(zehner(a)).not.toBe(zehner(b));
      expect(a % 10).toBe(b % 10);
    }
    let gedreht = 0;
    for (const ex of samplesOf(vergleichenSkill, 2, 2)) {
      const [a, b] = pruefeZeichen(ex);
      expect(hundert(a)).toBe(hundert(b));
      expect(a).not.toBe(b);
      if (zehner(a) === b % 10 && a % 10 === zehner(b)) gedreht++;
      else expect(zehner(a), ex.key).toBe(zehner(b));
    }
    expect(gedreht).toBeGreaterThan(30);
    const zeichen = new Set<string>();
    for (const ex of samplesOf(vergleichenSkill, 2, 3)) {
      const [a, b] = pruefeZeichen(ex);
      expect(hundert(a)).toBe(hundert(b));
      zeichen.add(correctLabel(ex));
    }
    expect(zeichen).toEqual(new Set(['<', '>', '=']));
  });

  it('Stufe 3: five numbers in the right order; each order bug is an order a child can tap and differs from the right one', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(vergleichenSkill, 3, ab)) {
        if (ex.answer.kind !== 'order') continue;
        const { items, correct, direction } = ex.answer;
        expect(items.length).toBe(5);
        expect(new Set(items).size).toBe(5);
        const zahlen = correct.map((i) => Number(items[i]));
        for (let i = 1; i < 5; i++) {
          if (direction === 'aufsteigend') expect(zahlen[i]).toBeGreaterThan(zahlen[i - 1]);
          else expect(zahlen[i]).toBeLessThan(zahlen[i - 1]);
        }
        expect(checkAnswer(ex.answer, { kind: 'order', order: [...correct].reverse() }, ex.bugs).bugHint).toBeTruthy();
        const hunderter = new Set(items.map((t) => hundert(Number(t))));
        if (ab === 1) expect(hunderter.size, ex.key).toBe(5);
        if (ab === 2) expect(hunderter.size, ex.key).toBeLessThan(5);
        if (ab === 3) expect(hunderter.size, ex.key).toBe(1);
      }
    }
  });

  it('Stufe 3: the cards go from the largest without a 0, to the smallest, to cards with a 0', () => {
    const pruefe = (ex: Exercise) => {
      const karten = ex.expression!.split(', ');
      const werte = (ex.answer as AnswerOf<'choice'>).options.map((o) => Number(o.label));
      for (const w of werte) {
        expect([...String(w)].sort()).toEqual([...karten].sort());
        expect(w).toBeGreaterThanOrEqual(100);
      }
      expect(Number(correctLabel(ex))).toBe(/größte/.test(ex.prompt) ? Math.max(...werte) : Math.min(...werte));
      if (/größte/.test(ex.prompt)) expect(correctLabel(ex)).toBe(karten.map(Number).sort((a, b) => b - a).join(''));
      return karten;
    };
    const karten = (ab: 1 | 2 | 3) => samplesOf(vergleichenSkill, 3, ab).filter((ex) => kindOf(ex) === 'karten');
    for (const ex of karten(1)) {
      expect(ex.prompt).toMatch(/größte/);
      expect(pruefe(ex)).not.toContain('0');
    }
    for (const ex of karten(2)) {
      expect(ex.prompt).toMatch(/kleinste/);
      expect(pruefe(ex)).not.toContain('0');
    }
    for (const ex of karten(3)) expect(pruefe(ex)).toContain('0');
  });

  it('digit cards: a wrong option hears about the first place that differs, and the praise fits a 0 on the cards', () => {
    let gleicheHunderter = 0;
    let mitNull = 0;
    for (const ex of samplesIn(vergleichenSkill, [[3, 1], [3, 2], [3, 3]], 300)) {
      if (kindOf(ex) !== 'karten') continue;
      const a = ex.answer as AnswerOf<'choice'>;
      const richtig = correctLabel(ex);
      for (const o of a.options) {
        if (o.label === richtig) continue;
        if (o.label[0] === richtig[0]) {
          gleicheHunderter++;
          expect(o.whyWrong, `${ex.key} ${o.label}`).toMatch(/^Die Hunderter stimmen\. Zu den Zehnern/);
        } else {
          expect(o.whyWrong, `${ex.key} ${o.label}`).toMatch(/kommt zu den Hundertern\.$/);
        }
      }
      if (/kleinste/.test(ex.prompt) && ex.expression!.split(', ').includes('0')) {
        mitNull++;
        expect(ex.praise, ex.key).toContain('ohne die 0');
      }
    }
    expect(gleicheHunderter).toBeGreaterThan(30);
    expect(mitNull).toBeGreaterThan(3);
  });

  it('Stufe 1: the sign and the choice line up both numbers in a table, without giving the sign; later only the steps do', () => {
    let seen = 0;
    for (const ex of samplesIn(vergleichenSkill, ZELLEN.filter(([s]) => s < 3), 150)) {
      const kind = kindOf(ex);
      if (kind === 'form' || kind === 'passend' || ex.stufe !== 1) {
        expect(ex.visual, ex.key).toBeUndefined();
        continue;
      }
      seen++;
      const zahlen = kind === 'zeichen' ? ex.expression!.split(' □ ').map(Number) : ex.key.split(':').slice(3, 5).map(Number);
      expect(tafelZahlen(ex.visual), ex.key).toEqual(zahlen);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('every worked solution shows the places in a table (§6: placeValue)', () => {
    const kinds = new Set<string>();
    for (const ex of samplesIn(vergleichenSkill, ZELLEN, 100)) {
      kinds.add(kindOf(ex));
      const zahlen = tafelZahlen(ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual ? [s.visual] : []))[0]);
      if (kindOf(ex) === 'zeichen') expect(zahlen, ex.key).toEqual(ex.expression!.split(' □ ').map(Number));
      if (kindOf(ex) === 'form') {
        const [links, rechts] = ex.expression!.split(' □ ');
        expect(zahlen, ex.key).toEqual([wert(links), wert(rechts)]);
      }
      if (kindOf(ex) === 'passend') expect(zahlen, ex.key).toEqual([Number(correctLabel(ex)), Number(ex.expression!.split(' ')[2])]);
      if (ex.answer.kind === 'order') {
        const { items, correct } = ex.answer;
        expect(zahlen, ex.key).toEqual(correct.map((i) => Number(items[i])));
      }
      if (kindOf(ex) === 'karten') expect(zahlen, ex.key).toEqual([Number(correctLabel(ex))]);
    }
    expect([...kinds].sort()).toEqual(['form', 'karten', 'ordnen', 'passend', 'welche', 'zeichen']);
  });

  it('praise on a tapped answer does not claim writing or laying', () => {
    for (const ex of samplesIn(vergleichenSkill, ZELLEN, 100)) {
      if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/geschrieben|gelegt|gesetzt/);
    }
  });
});
