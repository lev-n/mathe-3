import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { cents } from '../test-utils';
import { byAb, childTexts, pluralProblems, stepLines } from './test-support';
import { einkaufenSkill } from './einkaufen';
import { moneyPieces } from './helpers';

describeSkill(einkaufenSkill, { minDistinct: 30 });

/** Every comma amount of a text, in Cent. */
function amounts(text: string): number[] {
  return [...text.matchAll(/\d+,\d\d €/g)].map((m) => cents(m[0]));
}

const valueCents = (v: unknown) => Math.round((v as number) * 100);

describe('groessen.einkaufen', () => {
  it('worked solutions add up', () => {
    for (const ex of byAb(einkaufenSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('stories recompute from their amounts', () => {
    const seen = { zusammen: 0, drei: 0, mehr: 0, zurueck: 0 };
    for (const ex of byAb(einkaufenSkill)) {
      if (ex.answer.kind !== 'number') continue;
      const list = amounts(ex.context!);
      const v = valueCents(ex.answer.value);
      if (ex.prompt.includes('zusammen')) {
        expect(v, ex.key).toBe(list.reduce((s, c) => s + c, 0));
        if (list.length === 3) seen.drei++;
        else seen.zusammen++;
      } else if (ex.prompt.includes('mehr')) {
        expect(v, ex.key).toBe(list[0] - list[1]);
        expect(v, ex.key).toBeGreaterThan(0);
        seen.mehr++;
      } else if (ex.prompt.includes('Rückgeld')) {
        expect(v, ex.key).toBe(list[1] - list[0]);
        expect(v, ex.key).toBeGreaterThan(0);
        seen.zurueck++;
      } else {
        expect(v, ex.key).toBe(list[0] - list[1]);
        expect(v, ex.key).toBeGreaterThan(0);
      }
    }
    for (const n of Object.values(seen)) expect(n).toBeGreaterThan(20);
  });

  it('AB I uses whole euros and 50 ct, with sums up to 100 €', () => {
    for (const ex of byAb(einkaufenSkill, 1)) {
      for (const c of amounts(ex.context!)) expect([0, 50], ex.key).toContain(c % 100);
      if (ex.prompt.includes('zusammen') && ex.answer.kind === 'number') expect(ex.answer.value as number).toBeLessThanOrEqual(100);
    }
  });

  it('AB II pays Rückgeld from 20 € or 50 € and shows that note', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill, 2)) {
      if (!ex.prompt.includes('Rückgeld')) continue;
      seen++;
      const [, paid] = amounts(ex.context!);
      expect([2000, 5000], ex.key).toContain(paid);
      expect(ex.visual).toEqual({ type: 'money', items: [paid] });
      expect(ex.bugs!.some((b) => b.id === 'rueckgeld-cent'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('20 € − 12,40 € as 8,40 € is the Rückgeld bug', () => {
    const ex = byAb(einkaufenSkill, 2).find((e) => e.prompt.includes('Rückgeld'))!;
    const [price, paid] = amounts(ex.context!);
    const bug = ex.bugs!.find((b) => b.id === 'rueckgeld-cent')!;
    expect(valueCents(bug.match)).toBe(paid - Math.floor(price / 100) * 100 + price % 100);
  });

  it('Rückgeld: paying with a large note does not double the price of small things', () => {
    const highest: Readonly<Record<string, number>> = { Stift: 3, Heft: 3, Saft: 3, Brot: 5, Mappe: 6, Kuchen: 9 };
    let large = 0;
    for (const ex of byAb(einkaufenSkill)) {
      if (!ex.prompt.includes('Rückgeld')) continue;
      const [price, paid] = amounts(ex.context!);
      if (paid === 5000) large++;
      const item = /kauft \S+ (\S+) für/.exec(ex.context!)![1];
      if (item in highest) expect(price, ex.key).toBeLessThan((highest[item] + 1) * 100);
    }
    expect(large).toBeGreaterThan(20);
  });

  it('the goods are decoration: no key carries the name of a thing', () => {
    expect(byAb(einkaufenSkill).map((e) => e.key).filter((k) => /\p{Lu}/u.test(k))).toEqual([]);
  });

  it('"Reicht das Geld?" is answered by the sum of the 3 prices', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill, 3)) {
      if (ex.prompt !== 'Reicht das Geld?' || ex.answer.kind !== 'choice') continue;
      seen++;
      const list = amounts(ex.context!);
      const enough = list[3] >= list[0] + list[1] + list[2];
      expect(ex.answer.options[ex.answer.correct].label.startsWith(enough ? 'Ja' : 'Nein'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stückelung: the correct option has the fewest pieces, and every other either more or another sum', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill, 3)) {
      if (ex.answer.kind !== 'choice' || !ex.key.includes('stueckelung')) continue;
      seen++;
      const money = amounts(ex.prompt)[0];
      const right = ex.answer.options[ex.answer.correct].visual;
      expect(right).toEqual({ type: 'money', items: moneyPieces(money) });
      if (right?.type !== 'money') throw new Error('money expected');
      for (const o of ex.answer.options) {
        if (o.visual?.type !== 'money') throw new Error('money expected');
        const sum = o.visual.items.reduce((s, c) => s + c, 0);
        if (o !== ex.answer.options[ex.answer.correct] && sum === money) expect(o.visual.items.length, ex.key).toBeGreaterThan(right.items.length);
      }
      expect(ex.answer.options.length).toBeGreaterThanOrEqual(3);
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('groessen.einkaufen worked steps', () => {
  /** The lower and the higher amount of a task that counts up. */
  function ends(prompt: string, context: string): [number, number] | null {
    const list = amounts(context);
    if (prompt.includes('Rückgeld')) return [list[0], list[1]];
    if (prompt.includes('mehr') || prompt.includes('übrig')) return [list[1], list[0]];
    return null;
  }

  it('differences count up in steps that join from the lower to the higher amount (§2.4), and the last line is the answer', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill)) {
      const pair = ex.answer.kind === 'number' ? ends(ex.prompt, ex.context!) : null;
      if (!pair) continue;
      seen++;
      const lines = stepLines(ex);
      expect(lines.join(' '), ex.key).not.toMatch(/\d,\d\d[ \u00A0]€ −/);
      const legs = lines.filter((l) => l.startsWith('Von ')).map((l) => amounts(l));
      expect(legs[0][0], ex.key).toBe(pair[0]);
      expect(legs[legs.length - 1][1], ex.key).toBe(pair[1]);
      legs.forEach((leg, i) => {
        expect(leg[1], ex.key).toBeGreaterThan(leg[0]);
        if (i > 0) expect(leg[0], ex.key).toBe(legs[i - 1][1]);
        const size = /es (\d+)[ \u00A0](€|ct)/.exec(lines.filter((l) => l.startsWith('Von '))[i])!;
        expect(Number(size[1]) * (size[2] === '€' ? 100 : 1), ex.key).toBe(leg[1] - leg[0]);
      });
      expect(amounts(lines[lines.length - 1]).pop(), ex.key).toBe(pair[1] - pair[0]);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('"Reicht das Geld?" adds euros and cents apart before it compares', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill, 3)) {
      if (ex.prompt !== 'Reicht das Geld?') continue;
      seen++;
      const lines = stepLines(ex);
      expect(lines[0], ex.key).toMatch(/^Erst die Euro:/);
      expect(lines.join(' '), ex.key).not.toMatch(/\d,\d\d[ \u00A0]€ \+/);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('no text speaks of a column: the prices stand in sentences, and §2.4 rules out written calculation', () => {
    let swapped = 0;
    for (const ex of byAb(einkaufenSkill)) {
      for (const t of childTexts(ex)) expect(t, ex.key).not.toMatch(/\b(oben|unten)\b/);
      const bug = ex.bugs?.find((b) => b.id === 'cent-umgekehrt');
      if (!bug) continue;
      swapped++;
      expect(bug.hint, ex.key).toMatch(/^Rechne von \d+,\d\d[ \u00A0]€ erst bis \d+,00[ \u00A0]€, dann weiter bis /);
    }
    expect(swapped).toBeGreaterThan(20);
  });

  it('whole euros: no hint or praise speaks of cents or of rounding up to a euro', () => {
    let seen = 0;
    for (const ex of byAb(einkaufenSkill, 1)) {
      if (amounts(ex.context!).some((c) => c % 100 !== 0)) continue;
      seen++;
      for (const t of childTexts(ex)) expect(t, ex.key).not.toMatch(/\bCent\b|\bct\b|nächsten vollen Euro/);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a price in whole euros has no next full euro to go to', () => {
    for (const ex of byAb(einkaufenSkill, 1)) {
      if (!ex.prompt.includes('übrig') || amounts(ex.context!)[1] % 100 !== 0) continue;
      expect(ex.hints.join(' '), ex.key).not.toContain('nächsten vollen Euro');
    }
  });

  it('the value 1 takes the singular in every text, also in the answer sentence', () => {
    let one = 0;
    for (const ex of byAb(einkaufenSkill)) {
      expect(pluralProblems(ex)).toEqual([]);
      if (ex.answer.kind === 'number' && ex.prompt.includes('übrig') && ex.answer.value === 1) {
        one++;
        expect(ex.answer.before, ex.key).toBe('Es bleibt');
      }
    }
    expect(one).toBeGreaterThan(0);
  });
});

describe('groessen.einkaufen wording', () => {
  it('"wie viel mehr" keeps the capital of the noun', () => {
    for (const ex of byAb(einkaufenSkill).filter((e) => e.prompt.includes('mehr'))) expect(ex.prompt, ex.key).toMatch(/kostet (der|das|die) [A-ZÄÖÜ]/);
  });
});
