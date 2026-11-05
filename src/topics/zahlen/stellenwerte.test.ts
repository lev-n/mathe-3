import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { stellenwerteSkill } from './stellenwerte';
import { bugValue, expectScope, kindOf, samplesOf, solutionProblems } from './testHelp';

describeSkill(stellenwerteSkill);

const number = (ex: Exercise) => (ex.answer as AnswerOf<'number'>).value!;
const felder = (ex: Exercise) => (ex.answer as AnswerOf<'multi'>).fields.map((f) => f.value);
const WERT: Record<string, number> = { H: 100, Z: 10, E: 1 };

/** '4 E 3 H 2 Z = □' → 324, computed from the notation. */
const ausKurzform = (expression: string) => [...expression.matchAll(/(\d) ([HZE])/g)].reduce((sum, m) => sum + Number(m[1]) * WERT[m[2]], 0);

describe('zahlen.stellenwerte', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(stellenwerteSkill, {
      1: { 1: ['tafel'], 2: ['kurz'], 3: ['zerlege'] },
      2: { 1: ['null'], 2: ['durcheinander'], 3: ['durcheinander', 'zerlege'] },
      3: { 1: ['wert', 'zerlegen'], 2: ['summe', 'zerlegen'], 3: ['summe', 'welche'] },
    });
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(stellenwerteSkill)).toEqual([]);
  });

  it('Stufe 1: no zeros at any AB level; the answer is what the table or the notation says', () => {
    for (const ex of samplesOf(stellenwerteSkill, 1, 1)) {
      if (ex.visual?.type !== 'placeValue') throw new Error('no table');
      const [h, z, e] = ex.visual.rows[0].values as number[];
      expect(number(ex)).toBe(100 * h + 10 * z + e);
      expect([h, z, e]).not.toContain(0);
    }
    for (const ex of samplesOf(stellenwerteSkill, 1, 2)) {
      expect(number(ex)).toBe(ausKurzform(ex.expression!));
      expect(String(number(ex))).not.toContain('0');
    }
    for (const ex of samplesOf(stellenwerteSkill, 1, 3)) {
      const [h, z, e] = felder(ex);
      expect(ex.expression).toBe(`${h}${z}${e}`);
      expect([h, z, e]).not.toContain(0);
    }
  });

  it('Stufe 2, AB I: an empty place, with the look-alikes that compute exactly', () => {
    for (const ex of samplesOf(stellenwerteSkill, 2, 1)) {
      const n = number(ex);
      if (ex.expression) expect(ausKurzform(ex.expression)).toBe(n);
      expect(String(n)).toContain('0');
      const [h, a, b] = String(n).split('').map(Number);
      expect(bugValue(ex, 'null-vergessen')).toEqual([10 * h + (a || b)]);
      expect(bugValue(ex, 'null-falsche-stelle')).toEqual([a ? 100 * h + a : 100 * h + 10 * b]);
    }
  });

  it('Stufe 2, AB II: unordered places without a gap; AB III: unordered with a gap, or the number to its places with a 0', () => {
    for (const ex of samplesOf(stellenwerteSkill, 2, 2)) {
      expect(ex.expression, 'never in the order H, Z, E').not.toMatch(/^\d H/);
      expect(ausKurzform(ex.expression!)).toBe(number(ex));
      expect(String(number(ex))).not.toContain('0');
      const written = Number([...ex.expression!.matchAll(/(\d) [HZE]/g)].map((m) => m[1]).join(''));
      // the same digits can read as the number itself: 595 from 5 E 9 Z 5 H
      if (written !== number(ex)) expect(bugValue(ex, 'stellen-reihenfolge')).toEqual([written]);
    }
    let ungeordnet = 0;
    let zerlegt = 0;
    for (const ex of samplesOf(stellenwerteSkill, 2, 3)) {
      if (kindOf(ex) === 'durcheinander') {
        ungeordnet++;
        expect(ex.expression).not.toMatch(/^\d H/);
        expect(ausKurzform(ex.expression!)).toBe(number(ex));
        expect(String(number(ex))).toContain('0');
      } else {
        zerlegt++;
        const [h, z, e] = felder(ex);
        expect(ex.expression).toBe(`${h}${z}${e}`);
        expect([z, e]).toContain(0);
        expect(ex.praise, ex.key).toContain('die 0');
      }
    }
    expect(ungeordnet).toBeGreaterThan(30);
    expect(zerlegt).toBeGreaterThan(30);
  });

  it('a table or notation with a gap: the screen reader does not say the 0 the task tests', () => {
    for (const ex of samplesOf(stellenwerteSkill, 2, 1)) {
      expect(ex.srText, ex.key).not.toMatch(/(?<!\d)0 /);
      expect(ex.srText, ex.key).not.toMatch(/Null/);
    }
  });

  it('the split: each field names its place on screen, and another order of right values gets an explanation', () => {
    let seen = 0;
    for (const ex of [...samplesOf(stellenwerteSkill, 3, 1, 300), ...samplesOf(stellenwerteSkill, 3, 2, 300)]) {
      if (kindOf(ex) !== 'zerlegen') continue;
      seen++;
      const fields = (ex.answer as AnswerOf<'multi'>).fields;
      for (const f of fields) expect(f.before).toBe(`${f.label}:`);
      const [x, ...rest] = fields.map((f) => f.value);
      const gedreht = [...rest, x];
      const r = checkAnswer(ex.answer, { kind: 'multi', values: Object.fromEntries(fields.map((f, i) => [f.id, String(gedreht[i])])) }, ex.bugs);
      expect(r.correct).toBe(false);
      expect(r.bugHint, ex.key).toMatch(/Die Werte stimmen/);
    }
    expect(seen).toBeGreaterThan(50);
  });

  const pruefeZerlegen = (ex: Exercise) => {
    const n = Number(ex.expression!.split(' ')[0]);
    expect(felder(ex).reduce((a, b) => a + b, 0)).toBe(n);
    return n;
  };
  const summe = (ex: Exercise) => ex.expression!.replace(' = □', '').split(' + ').map(Number).reduce((x, y) => x + y, 0);

  /** Ordering the parts is not enough, as it is for 5 E 3 H: one part has 2 digits that are not a 0. */
  const expectSpanningPart = (ex: Exercise) => {
    const teile = ex.expression!.replace(' = □', '').split(' + ');
    expect(teile.some((t) => t.replace(/0/g, '').length >= 2), ex.key).toBe(true);
  };

  it('the value of a digit: never the Einer, whose value stands in the question', () => {
    for (const ex of samplesOf(stellenwerteSkill, 3, 1, 400)) {
      if (kindOf(ex) === 'wert') expect(ex.prompt, ex.key).not.toMatch(new RegExp(`(?<!\\d)${number(ex)}(?!\\d)`));
    }
  });

  it('Stufe 3, AB I: the value of a digit, and the split without a zero', () => {
    for (const ex of samplesOf(stellenwerteSkill, 3, 1)) {
      if (kindOf(ex) === 'zerlegen') {
        expect(String(pruefeZerlegen(ex))).not.toContain('0');
      } else {
        const [d, n] = (/die (\d) in (\d+)/.exec(ex.prompt) ?? []).slice(1);
        expect(number(ex)).toBe(Number(d) * 10 ** (n.length - 1 - n.indexOf(d)));
      }
    }
  });

  it('Stufe 3, AB II: the split with a zero, and a sum without one', () => {
    for (const ex of samplesOf(stellenwerteSkill, 3, 2)) {
      if (kindOf(ex) === 'zerlegen') {
        const n = pruefeZerlegen(ex);
        expect([...String(n)].filter((d) => d === '0').length, ex.key).toBe(1);
        // the prompt names 3 places: a missing field would show which one is empty
        expect((ex.answer as AnswerOf<'multi'>).fields.map((f) => f.label), ex.key).toEqual(['Hunderter', 'Zehner', 'Einer']);
      } else {
        expect(number(ex)).toBe(summe(ex));
        expect(String(number(ex))).not.toContain('0');
        expectSpanningPart(ex);
      }
    }
  });

  it('Stufe 3, AB III: the number with a digit of that value, and a sum with a gap', () => {
    for (const ex of samplesOf(stellenwerteSkill, 3, 3)) {
      if (kindOf(ex) === 'summe') {
        expect(number(ex)).toBe(summe(ex));
        expect(String(number(ex))).toContain('0');
        expectSpanningPart(ex);
      } else {
        const a = ex.answer as AnswerOf<'choice'>;
        const [d, wert] = (/die (\d) den Wert (\d+)/.exec(ex.prompt) ?? []).slice(1);
        const n = a.options[a.correct].label;
        expect(Number(d) * 10 ** (n.length - 1 - n.indexOf(d))).toBe(Number(wert));
        // every other option has the digit at another place
        for (const o of a.options) if (o.label !== n) expect(o.label.indexOf(d)).not.toBe(n.indexOf(d));
      }
    }
  });
});
