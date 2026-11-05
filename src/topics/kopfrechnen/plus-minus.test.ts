import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { strichSteps } from './helpers';
import { aufgabe, einStelle, luecke, plusMinusSkill, uebergangTask, zweiStellenTask } from './plus-minus';
import { formOf, itRecomputes, itStaysReadable } from './testkit';

describeSkill(plusMinusSkill);

const parse = (expression: string) => {
  const m = /^(\d+) (\+|−) (\d+) = □$/.exec(expression);
  return m ? { n: Number(m[1]), op: m[2], m: Number(m[3]) } : null;
};

describe('kopfrechnen.plus-minus', () => {
  itRecomputes(plusMinusSkill);
  itStaysReadable(plusMinusSkill);

  it('Stufe 1 changes one place and never crosses a hundred or a ten', () => {
    for (const ex of samples(plusMinusSkill, 1).filter((e) => formOf(e) === 'stelle')) {
      const t = parse(ex.expression as string);
      if (!t) throw new Error(ex.key);
      const r = t.op === '+' ? t.n + t.m : t.n - t.m;
      const changed = [100, 10, 1].filter((place) => Math.floor(t.n / place) % 10 !== Math.floor(r / place) % 10);
      expect(changed.length, ex.key).toBe(1);
      expect(Math.floor(t.m / changed[0]) % 10 === t.m / changed[0], ex.key).toBe(true);
    }
  });

  it('Stufe 2 crosses a hundred, and never lands on one', () => {
    for (const ex of samples(plusMinusSkill, 2).filter((e) => formOf(e) === 'ueber')) {
      const t = parse(ex.expression as string);
      if (!t) throw new Error(ex.key);
      const r = t.op === '+' ? t.n + t.m : t.n - t.m;
      expect(Math.floor(r / 100), ex.key).not.toBe(Math.floor(t.n / 100));
      expect(r % 100, ex.key).not.toBe(0);
    }
  });

  it('Stufe 3 has three steps that add up, and results stay inside 1000', () => {
    const felder = samples(plusMinusSkill, 3).filter((e) => formOf(e) === 'felder');
    expect(felder.length).toBeGreaterThan(0);
    for (const ex of felder) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      const [, n, op, m] = /Rechne (\d+) (\+|−) (\d+) in/.exec(ex.prompt) as RegExpExecArray;
      const r = op === '+' ? Number(n) + Number(m) : Number(n) - Number(m);
      expect(ex.answer.fields).toHaveLength(3);
      expect(ex.answer.fields[2].value).toBe(r);
      expect(r).toBeLessThanOrEqual(1000);
    }
  });

  it('says the Zehner stay the same only where they do', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(plusMinusSkill, stufe, 2000)) {
        for (const b of ex.bugs ?? []) {
          if (!b.hint.includes('Der Zehner bleibt gleich')) continue;
          const t = parse(ex.expression ?? '');
          if (!t) throw new Error(`${ex.key}: ${b.hint}`);
          const r = t.op === '+' ? t.n + t.m : t.n - t.m;
          expect(Math.floor(r / 10) % 10, `${ex.key}: ${b.hint}`).toBe(Math.floor(t.n / 10) % 10);
        }
      }
    }
  });

  it('names the Einer of the last field, whether or not that step crosses a ten', () => {
    const items = samples(plusMinusSkill, 3, 2000).filter((e) => formOf(e) === 'felder');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const hint = ex.bugs?.find((b) => b.id === 'stelle-verwechselt')?.hint;
      if (hint) expect(hint, ex.key).toMatch(/^(?:1 ist ein Einer, kein Zehner|[2-9] sind Einer, keine Zehner)\. Nimm nur [1-9] (?:dazu|weg)\.$/);
    }
  });

  it('a gap shows the way in steps, over the full hundreds', () => {
    const texts = (...args: Parameters<typeof luecke>) => luecke(...args).steps.map((s) => (typeof s === 'string' ? s : s.text));
    expect(texts(aufgabe(680, '+', 70), false, '')).toEqual(['Zuerst bis 700: 680 + 20 = 700.', 'Dann bis 750: 700 + 50 = 750.', 'Zusammen: 20 + 50 = 70.', 'Also: 680 + 70 = 750.']);
    expect(texts(aufgabe(680, '+', 70), true, '')).toEqual(['Umkehraufgabe: 750 − 70 = □.', 'Zuerst bis 700: 750 − 50 = 700.', 'Dann bis 680: 700 − 20 = 680.', 'Also: 680 + 70 = 750.']);
    expect(texts(aufgabe(657, '+', 263), false, '').slice(0, 4)).toEqual(['Zuerst bis 700: 657 + 43 = 700.', 'Dann bis 900: 700 + 200 = 900.', 'Dann bis 920: 900 + 20 = 920.', 'Zusammen: 43 + 200 + 20 = 263.']);
    expect(texts(aufgabe(420, '−', 70), false, '').slice(0, 2)).toEqual(['Zuerst bis 400: 420 − 20 = 400.', 'Dann bis 350: 400 − 50 = 350.']);
    expect(texts(aufgabe(340, '+', 50), false, '')).toEqual(['Von 340 bis 390 ändern sich nur die Zehner.', '5 Zehner sind 50.', 'Also: 340 + 50 = 390.']);
  });

  it('every gap of Stufe 2 and 3 walks from number to number, and its jumps add up', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(plusMinusSkill, stufe, 2000).filter((e) => formOf(e) === 'luecke')) {
        const lines = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
        const jumps = lines.flatMap((t) => [.../^(?:Zuerst|Dann) bis (\d+): (\d+) (\+|−) (\d+) = (\d+)\.$/.exec(t) ?? []].slice(1, 6)).map((x) => (x === '+' || x === '−' ? x : Number(x)));
        expect(jumps.length, `${ex.key}: ${lines.join(' / ')}`).toBeGreaterThanOrEqual(10);
        for (let i = 0; i < jumps.length; i += 5) {
          const [to, from, op, size, end] = jumps.slice(i, i + 5) as [number, number, string, number, number];
          expect(to, ex.key).toBe(end);
          expect(op === '+' ? from + size : from - size, ex.key).toBe(end);
          if (i > 0) expect(from, ex.key).toBe(jumps[i - 1]);
        }
      }
    }
  });

  it('the steps of the fields are no chain of equals signs', () => {
    const items = samples(plusMinusSkill, 3, 2000).filter((e) => formOf(e) === 'felder');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      if (ex.answer.kind !== 'multi') throw new Error('multi');
      for (const f of ex.answer.fields.slice(1)) expect(f.before, ex.key).toMatch(/^dann \d+ (dazu|weg):$/);
      expect(formatAnswer(ex.answer).match(/=/g), ex.key).toHaveLength(1);
    }
  });

  it('a way with small and big jumps gets one picture per stretch', () => {
    const steps = strichSteps([933, 133, 123, 114], ['a', 'b', 'c']);
    const shown = steps.map((s) => (typeof s !== 'string' && s.visual?.type === 'numberLine' ? s.visual.labels : null));
    expect(shown).toEqual([[933, 133], null, [133, 123, 114]]);
  });

  it('computes the §5 bugs on the examples of the catalogue', () => {
    expect(einStelle(aufgabe(340, '+', 5), false).bugs?.find((b) => b.id === 'stelle-verwechselt')?.match).toBe(390);
    expect(uebergangTask(aufgabe(380, '+', 50)).bugs?.filter((b) => b.id === 'hunderter-uebergang').map((b) => b.match)).toEqual([330, 3130]);
    expect(uebergangTask(aufgabe(420, '−', 70)).steps[0]).toBe('Zuerst bis 400: 420 − 20 = 400.');
    expect(zweiStellenTask(aufgabe(432, '−', 58)).bugs?.find((b) => b.id === 'minus-spalten')?.match).toBe(426);
  });
});
