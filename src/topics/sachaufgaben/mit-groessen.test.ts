import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, NumberAnswer, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX, cents, times } from '../test-utils';
import { WANDERTAG_KM, rueckgeldBugs } from './helpers';
import { mitGroessenSkill } from './mit-groessen';
import { largestNumber, priceOf } from './testkit';

describeSkill(mitGroessenSkill, { minDistinct: 40 });

function byAb(ab: Ab, n = 200): Exercise[] {
  return STUFEN.flatMap((stufe: Stufe) => Array.from({ length: n }, (_, i) => mitGroessenSkill.generate(createRng(i * 601 + stufe), stufe, { ...CTX, ab })));
}

const value = (ex: Exercise) => (ex.answer as NumberAnswer).value as number;

describe('sachaufgaben.mit-groessen', () => {
  it('AB I: whole numbers, one step, recomputed', () => {
    const forms = new Set<string>();
    for (const ex of byAb(1)) {
      const [, , form, x, y] = ex.key.split(':');
      const [a, b] = [Number(x), Number(y)];
      forms.add(form);
      expect((ex.answer as NumberAnswer).decimals).toBeUndefined();
      expect(value(ex)).toBe(form.endsWith('-plus') ? a + b : form === 'euro-mal' ? a * b : a - b);
      expect(value(ex)).toBeGreaterThan(0);
      expect(ex.steps.length).toBe(2);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...forms].sort()).toEqual(['band', 'euro-mal', 'euro-minus', 'euro-plus', 'km-minus', 'km-plus']);
  });

  it('AB II: comma prices and Rückgeld recomputed from the text; grams from the key', () => {
    const forms = new Set<string>();
    for (const ex of byAb(2)) {
      const [, , form] = ex.key.split(':');
      forms.add(form);
      if (form === 'komma-plus') {
        const [x, y] = ex.context!.split(' und ').map(cents);
        expect(Math.round(value(ex) * 100)).toBe(x + y);
        expect((ex.answer as NumberAnswer).decimals).toBe(2);
      } else if (form === 'rueckgeld') {
        const [paid, price] = ex.key.split(':').slice(3).map(Number);
        expect(Math.round(value(ex) * 100)).toBe(paid * 100 - price);
        expect(price).toBeLessThan(paid * 100);
      } else {
        const [, , , dir, a, b] = ex.key.split(':');
        expect(value(ex)).toBe(dir === 'plus' ? Number(a) + Number(b) : Number(a) - Number(b));
      }
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...forms].sort()).toEqual(['gewicht', 'komma-plus', 'rueckgeld']);
  });

  it('AB III: time spans and mixed units in two steps, recomputed', () => {
    const forms = new Set<string>();
    for (const ex of byAb(3)) {
      const parts = ex.key.split(':');
      const form = parts[2];
      forms.add(form);
      const nums = parts.slice(3).map(Number);
      if (form === 'zeit') {
        const [t1, t2] = times(ex.context!);
        expect(value(ex)).toBe(t2 - t1);
        expect(value(ex)).toBeLessThanOrEqual(90);
      } else if (form === 'zeit-zwei') {
        const [t1, t2] = times(ex.context!);
        expect(value(ex)).toBe(t2 - t1 + nums[3]);
      } else if (form === 'weg') {
        expect(value(ex)).toBe(1000 - 2 * nums[0]);
      } else {
        expect(form).toBe('einkauf');
        expect(value(ex)).toBe(1000 - nums[1] * nums[0]);
      }
      expect(value(ex)).toBeGreaterThan(0);
      expect(value(ex)).toBeLessThanOrEqual(1000);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    expect([...forms].sort()).toEqual(['einkauf', 'weg', 'zeit', 'zeit-zwei']);
  });

  it('the targeted hints fire: 100 minutes per hour, mixed units, the first step only', () => {
    const fired = new Set<string>();
    for (const ex of byAb(3)) {
      for (const bug of ex.bugs ?? []) {
        const r = checkAnswer(ex.answer, { kind: 'number', text: String(bug.match) }, ex.bugs);
        if (r.bugId) fired.add(r.bugId);
      }
    }
    for (const id of ['stunde-100', 'einheit-gemischt', 'nur-erster-schritt']) expect(fired).toContain(id);
  });

  it('a clock shown in a task is the start of the span and uses five minutes steps', () => {
    for (const ex of byAb(3)) {
      if (ex.visual?.type !== 'clock') continue;
      expect(ex.visual.minutes % 5).toBe(0);
      expect(times(ex.context!)[0]).toBe(ex.visual.hours * 60 + ex.visual.minutes);
    }
  });

  it('exactly 100 ct make 1 €: the hints do not say "mehr als"', () => {
    const exact = byAb(2, 600).filter((ex) => {
      if (!ex.key.includes(':komma-plus:')) return false;
      const [x, y] = ex.key.split(':').slice(3).map(Number);
      return x % 100 + y % 100 === 100;
    });
    expect(exact.length).toBeGreaterThan(0);
    for (const ex of exact) {
      const bug = ex.bugs!.find((b) => b.id === 'komma-cent-summe')!;
      expect(bug.hint, ex.key).toContain('sind genau 1 €');
      expect(ex.hints.join(' '), ex.key).toContain('100 ct oder mehr');
    }
  });

  it('the calculation stays up to 1000 on every Stufe: only a conversion line passes it', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of byAb(ab, 300)) {
        for (const t of [ex.context ?? '', ex.prompt, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(largestNumber(t.replace(/\d+\.\d+/g, '')), `${ex.key}: ${t}`).toBeLessThanOrEqual(1000);
        if (ex.answer.kind === 'number' && ex.answer.value !== null) expect(ex.answer.value, ex.key).toBeLessThanOrEqual(1000);
        for (const step of ex.steps) {
          const text = typeof step === 'string' ? step : step.text;
          const result = text.split(' = ').pop() as string;
          if (largestNumber(result) > 1000) expect(text, ex.key).toMatch(/^\d+.(kg|km)( \d+.g)? = /);
        }
      }
    }
  });

  it('the higher Stufe has the harder numbers in the mixed stories', () => {
    const step = (stufe: Stufe) => {
      const exs = Array.from({ length: 400 }, (_, i) => mitGroessenSkill.generate(createRng(i * 431 + stufe), stufe, { ...CTX, ab: 3 })).filter((e) => e.key.includes(':weg:') || e.key.includes(':einkauf:'));
      return Math.min(...exs.map((e) => Number(e.key.split(':')[3]) % 100 || 100));
    };
    expect(step(1)).toBe(100);
    expect(step(2)).toBe(50);
    expect(step(3)).toBe(10);
  });

  it('Mehl always weighs 1 kg, the Stützpunkt of the portal', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of byAb(ab, 300)) {
        if (/Packung Mehl|Sack Mehl/.test(ex.context ?? '')) expect(ex.context, ex.key).toContain('Eine Packung Mehl wiegt 1\u00A0kg.');
      }
    }
  });

  it('a class walks what a Wandertag allows; the larger numbers of a higher Stufe belong to a bus', () => {
    let hikes = 0;
    let buses = 0;
    for (const ex of byAb(1, 600)) {
      if (!ex.key.includes(':km-plus:')) continue;
      if (ex.context!.includes('wandert')) {
        hikes++;
        expect(value(ex), ex.context).toBeGreaterThanOrEqual(WANDERTAG_KM[0]);
        expect(value(ex), ex.context).toBeLessThanOrEqual(WANDERTAG_KM[1]);
      } else {
        buses++;
        expect(ex.context, ex.key).toMatch(/^Der Bus fährt/);
      }
    }
    expect(hikes).toBeGreaterThan(0);
    expect(buses).toBeGreaterThan(0);
  });

  it('rueckgeld-cent is the pattern of §5: 20 € − 12,40 € as 8,40 €; the 8,60 € of the Euro not given up has its own hint', () => {
    expect(rueckgeldBugs(20, 1240).map((b) => [b.id, b.match])).toEqual([['rueckgeld-cent', 8.4], ['rueckgeld-euro', 8.6]]);
    let seen = 0;
    for (const ex of byAb(2, 600)) {
      if (!ex.key.includes(':rueckgeld:')) continue;
      seen++;
      const [paid, price] = ex.key.split(':').slice(3).map(Number);
      const copied = paid - Math.floor(price / 100) + (price % 100) / 100;
      const typed = (x: number) => checkAnswer(ex.answer, { kind: 'number', text: x.toFixed(2).replace('.', ',') }, ex.bugs).bugId;
      expect(typed(copied), ex.key).toBe('rueckgeld-cent');
      // at 50 ct the two patterns are one number
      expect(typed(value(ex) + 1), ex.key).toBe(price % 100 === 50 ? 'rueckgeld-cent' : 'rueckgeld-euro');
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('mal taken as plus gets a hint about the same price many times, not the question "mehr oder weniger"', () => {
    let seen = 0;
    for (const ex of byAb(1, 600)) {
      if (!ex.key.includes(':euro-mal:')) continue;
      const [k, n] = ex.key.split(':').slice(3).map(Number);
      if (n + k === n * k) continue;
      seen++;
      const r = checkAnswer(ex.answer, { kind: 'number', text: String(n + k) }, ex.bugs);
      expect(r.bugId, ex.key).toBe('rechenart-+');
      expect(r.bugHint, ex.key).toContain(`${n}-mal`);
      expect(r.bugHint, ex.key).not.toMatch(/mehr oder weniger\?$/);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('two things that are only added up: "wird es mehr oder weniger" has nothing that changes', () => {
    let seen = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of byAb(ab, 600)) {
        if (!ex.key.includes(':euro-plus:') && !ex.key.includes(':gewicht:plus:')) continue;
        seen++;
        for (const b of ex.bugs ?? []) expect(b.hint, ex.key).toMatch(/^Beides zusammen/);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('prices and money stay believable: a Heft up to 4 €, a Buch up to 25 €, a child with 50 € at most', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of byAb(ab, 300)) {
        const context = ex.context ?? '';
        const heft = priceOf('Heft', context);
        if (heft !== null) expect(heft, context).toBeLessThanOrEqual(4);
        const buch = priceOf('Buch', context);
        if (buch !== null && ex.key.includes(':euro-')) expect(buch, context).toBeLessThanOrEqual(25);
        const money = /^\S+ hat (\d+)/.exec(context);
        if (money && !context.startsWith('Die Klasse')) expect(Number(money[1]), context).toBeLessThanOrEqual(50);
      }
    }
  });
});
