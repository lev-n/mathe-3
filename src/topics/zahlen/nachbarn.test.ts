import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { numberLineAriaLabel } from '../../ui/visuals/NumberLineVisual';
import { nachbarnSkill } from './nachbarn';
import { bugValue, expectScope, kindOf, samplesIn, samplesOf, solutionProblems } from './testHelp';

describeSkill(nachbarnSkill);

const fields = (ex: Exercise) => Object.fromEntries((ex.answer as AnswerOf<'multi'>).fields.map((f) => [f.id, f.value]));
const zahlIn = (text: string) => Number(/\d+/.exec(text)![0]);
const zahlenIn = (text: string) => [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));

/** All numbers up to 1000 that fit the clues of a riddle: the clues are read from the text, not from the generator. */
function passend(prompt: string): number[] {
  const nz = /Nachbarzehner nach (unten|oben): (\d+)/.exec(prompt);
  const nh = /Nachbarhunderter nach (unten|oben): (\d+)/.exec(prompt);
  const danach = /Zahl nach mir endet auf (\d)/.exec(prompt);
  const davor = /Zahl vor mir endet auf (\d)/.exec(prompt);
  const zweiNach = /Zahl 2 nach mir endet auf (\d)/.exec(prompt);
  const zweiVor = /Zahl 2 vor mir endet auf (\d)/.exec(prompt);
  const fits = (n: number) =>
    (!nz || (nz[1] === 'unten' ? Math.floor(n / 10) * 10 === Number(nz[2]) && n % 10 !== 0 : Math.ceil(n / 10) * 10 === Number(nz[2]) && n % 10 !== 0)) &&
    (!nh || (nh[1] === 'unten' ? Math.floor(n / 100) * 100 === Number(nh[2]) && n % 100 !== 0 : Math.ceil(n / 100) * 100 === Number(nh[2]) && n % 100 !== 0)) &&
    (!danach || (n + 1) % 10 === Number(danach[1])) &&
    (!davor || (n - 1) % 10 === Number(davor[1])) &&
    (!zweiNach || (n + 2) % 10 === Number(zweiNach[1])) &&
    (!zweiVor || (n - 2) % 10 === Number(zweiVor[1]));
  return Array.from({ length: 1001 }, (_, n) => n).filter(fits);
}

describe('zahlen.nachbarn', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(nachbarnSkill, {
      1: { 1: ['nachbar'], 2: ['nachbar'], 3: ['vomnachbarn', 'zwischen'] },
      2: { 1: ['hunderter', 'zehner'], 2: ['ueber', 'zehner'], 3: ['welche'] },
      3: { 1: ['raetsel'], 2: ['raetsel'], 3: ['raetsel'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(nachbarnSkill)).toEqual([]);
  });

  it('Stufe 1: before and after, inside a ten, at every AB level', () => {
    for (const ex of samplesOf(nachbarnSkill, 1, 1)) {
      const n = zahlIn(ex.prompt);
      expect(n % 10).toBeGreaterThanOrEqual(1);
      expect(n % 10).toBeLessThanOrEqual(8);
      const f = fields(ex);
      expect(Object.keys(f).length, 'one number on AB I').toBe(1);
      if ('v' in f) expect(f.v).toBe(n - 1);
      if ('f' in f) expect(f.f).toBe(n + 1);
    }
    for (const ex of samplesOf(nachbarnSkill, 1, 2)) {
      const n = zahlIn(ex.prompt);
      expect(n % 10).toBeGreaterThanOrEqual(2);
      expect(n % 10).toBeLessThanOrEqual(8);
      expect(fields(ex)).toEqual({ v: n - 1, f: n + 1 });
      expect(bugValue(ex, 'vertauscht')).toEqual([{ v: n + 1, f: n - 1 }]);
    }
    for (const ex of samplesOf(nachbarnSkill, 1, 3)) {
      const z = fields(ex).z;
      expect(Math.floor(z / 10), ex.key).toBe(Math.floor((z - 1) / 10));
      expect(Math.floor(z / 10), ex.key).toBe(Math.floor((z + 1) / 10));
      expect(ex.visual, 'no line in the task: it would label the number').toBeUndefined();
      if (kindOf(ex) === 'zwischen') {
        const [a, b] = zahlenIn(ex.prompt);
        expect(b - a).toBe(2);
        expect(z).toBe(a + 1);
      } else {
        const g = zahlIn(ex.prompt);
        expect(z).toBe(/nach dieser/.test(ex.prompt) ? g - 1 : g + 1);
      }
    }
  });

  it('no task picture prints an answer: both ends of a labelled line stay apart from the fields', () => {
    let seen = 0;
    let einsDanach = 0;
    for (const ex of samplesIn(nachbarnSkill, [[1, 1], [1, 2], [2, 2]], 500)) {
      if (ex.visual?.type !== 'numberLine') continue;
      seen++;
      const v = ex.visual;
      const gedruckt = [...(v.labelMajor ? Array.from({ length: (v.max - v.min) / v.majorStep + 1 }, (_, i) => v.min + i * v.majorStep) : []), ...(v.labels ?? []), ...(v.marks ?? []).map((m) => m.value)];
      for (const value of Object.values(fields(ex))) expect(gedruckt, ex.key).not.toContain(value);
      if (kindOf(ex) === 'nachbar' && zahlIn(ex.prompt) % 10 === 1) {
        einsDanach++;
        expect(Object.keys(fields(ex)), ex.key).toEqual(['f']);
      }
    }
    expect(seen).toBeGreaterThan(300);
    expect(einsDanach).toBeGreaterThan(0);
  });

  it('Stufe 2, AB I: Nachbarzehner inside a hundred and Nachbarhunderter enclose the number', () => {
    for (const ex of samplesOf(nachbarnSkill, 2, 1)) {
      const n = zahlIn(ex.prompt);
      const f = fields(ex);
      if (kindOf(ex) === 'zehner') {
        expect(f.u).toBe(Math.floor(n / 10) * 10);
        expect(f.o).toBe(f.u + 10);
        expect(f.u).toBeLessThan(n);
        expect(f.o).toBeGreaterThan(n);
        expect(Math.floor(f.o / 100), 'inside a hundred').toBe(Math.floor(f.u / 100));
      } else {
        expect(f.u).toBe(Math.floor(n / 100) * 100);
        expect(f.o).toBe(f.u + 100);
        expect(f.u).toBeLessThan(n);
      }
    }
  });

  it('Stufe 2, AB II: across a hundred; 399 then 300 or 3100', () => {
    let seen = 0;
    for (const ex of samplesOf(nachbarnSkill, 2, 2, 300)) {
      const n = zahlIn(ex.prompt);
      const f = fields(ex);
      if (kindOf(ex) === 'zehner') {
        expect(f.o % 100, ex.key).toBe(0);
        expect(f.o - 10).toBe(f.u);
        expect(f.u).toBeLessThan(n);
        expect(f.o).toBeLessThanOrEqual(1000);
        continue;
      }
      expect(n % 100 === 0 || n % 100 === 99).toBe(true);
      expect(f.v).toBe(n - 1);
      expect(f.f).toBe(n + 1);
      expect(f.f).toBeLessThanOrEqual(1000);
      if (n % 100 === 99) {
        seen++;
        expect(bugValue(ex, 'zaehlen-hunderter')).toEqual([{ f: n + 1 - 100 }, { f: Number(`${Math.floor(n / 100)}100`) }]);
      }
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('Stufe 2, AB III: the other way round; exactly one option has the named neighbours', () => {
    for (const ex of samplesOf(nachbarnSkill, 2, 3)) {
      const [lo, hi] = zahlenIn(ex.prompt);
      const auf = /hunderter/.test(ex.prompt) ? 100 : 10;
      expect(hi - lo).toBe(auf);
      const a = ex.answer as AnswerOf<'choice'>;
      const passt = a.options.filter((o) => Number(o.label) > lo && Number(o.label) < hi);
      expect(passt.map((o) => o.label), ex.key).toEqual([a.options[a.correct].label]);
      for (const o of a.options) expect(Number(o.label)).toBeLessThanOrEqual(1000);
    }
  });

  it('Stufe 3: every riddle at every AB level has exactly one solution up to 1000, and it is the answer', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(nachbarnSkill, 3, ab, 300)) {
        expect(kindOf(ex)).toBe('raetsel');
        expect(passend(ex.prompt), ex.prompt).toEqual([fields(ex).z]);
        expect(ex.prompt, ex.key).toMatch(/^(Mein )?Nachbar.*\. Wer bin ich\?$/);
        // 2 neighbour clues (§6): one Nachbarzehner, and one number beside the number sought
        expect(ex.prompt, ex.key).toMatch(/Nachbarzehner nach (oben|unten): \d+\. Die Zahl (2 )?(nach|vor) mir/);
        expect(ex.prompt, ex.key).not.toMatch(/Nachbarhunderter|Ich habe/);
        expect(ex.prompt, ex.key).not.toMatch(/Zahl (danach|davor)/);
      }
    }
  });

  it('Stufe 3: AB I counts on from below, AB II counts back from above, AB III goes 2 away, also beyond the ten', () => {
    for (const ex of samplesOf(nachbarnSkill, 3, 1)) expect(ex.prompt).toMatch(/^Mein Nachbarzehner nach unten: \d+\. Die Zahl nach mir/);
    for (const ex of samplesOf(nachbarnSkill, 3, 2)) expect(ex.prompt).toMatch(/^Mein Nachbarzehner nach oben: \d+\. Die Zahl vor mir/);
    let jenseits = 0;
    for (const ex of samplesOf(nachbarnSkill, 3, 3, 300)) {
      expect(ex.prompt).toMatch(/Die Zahl 2 (nach|vor) mir/);
      const n = fields(ex).z;
      const nachbar = /2 vor/.test(ex.prompt) ? n - 2 : n + 2;
      if (Math.floor(nachbar / 10) !== Math.floor(n / 10)) jenseits++;
    }
    expect(jenseits).toBeGreaterThan(30);
  });

  it('a line never names a number sought: not at its ends, not to a screen reader (999 has no line, it would end at 1000)', () => {
    let seen = 0;
    for (const ex of samplesIn(nachbarnSkill, [[1, 1], [1, 2], [2, 2]], 800)) {
      if (ex.answer.kind !== 'multi') continue;
      if (kindOf(ex) === 'ueber' && zahlIn(ex.prompt) === 999) {
        seen++;
        expect(ex.visual, ex.key).toBeUndefined();
      }
      if (ex.visual?.type !== 'numberLine') continue;
      const label = numberLineAriaLabel(ex.visual);
      for (const f of ex.answer.fields) expect(label, ex.key).not.toMatch(new RegExp(`(?<!\\d)${f.value}(?!\\d)`));
    }
    expect(seen).toBeGreaterThan(0);
  });
});
