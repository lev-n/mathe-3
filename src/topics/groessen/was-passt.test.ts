import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { byAb, childTexts, pluralProblems, unitChoiceProblems } from './test-support';
import { wasPasstSkill } from './was-passt';

describeSkill(wasPasstSkill, { minDistinct: { 1: 15, 2: 15, 3: 30 } });

describe('groessen.was-passt', () => {
  it('worked solutions add up', () => {
    for (const ex of byAb(wasPasstSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('every task is a choice with a reason for each wrong option, as the catalogue says', () => {
    for (const ex of byAb(wasPasstSkill)) {
      const a = ex.answer;
      if (a.kind !== 'choice') throw new Error('choice expected');
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(o.whyWrong, ex.key).toBeTruthy();
      });
    }
  });

  it('AB I offers units, AB II offers values', () => {
    const unitOnly = /^(mm|cm|m|km|g|kg|s|min|h|ct|€)$/;
    for (const ex of byAb(wasPasstSkill, 1)) {
      if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.label, ex.key).toMatch(unitOnly));
    }
    for (const ex of byAb(wasPasstSkill, 2)) {
      if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.label, ex.key).toMatch(/^\d+ (mm|cm|m|km|g|kg|s|min|h|ct|€)$/));
    }
  });

  it('AB II: the worked solution states the right value', () => {
    for (const ex of byAb(wasPasstSkill, 2)) {
      const a = ex.answer;
      if (a.kind !== 'choice') continue;
      const last = ex.steps[ex.steps.length - 1] as string;
      expect(last, ex.key).toContain(a.options[a.correct].label);
    }
  });

  it('"too much" and "too little" point the right way', () => {
    for (const ex of byAb(wasPasstSkill, 2)) {
      const a = ex.answer;
      if (a.kind !== 'choice' || !ex.prompt.includes('Tür')) continue;
      for (const o of a.options) {
        if (o.label === '20 cm') expect(o.whyWrong).toMatch(/kurz/);
        if (o.label === '20 m') expect(o.whyWrong).toMatch(/lang/);
      }
    }
  });

  it('AB III: the impossible statement is the answer, the others are facts', () => {
    let seen = 0;
    for (const ex of byAb(wasPasstSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'choice' || ex.context) continue;
      seen++;
      expect(a.options.length).toBe(4);
      expect(a.options[a.correct].whyWrong).toBeUndefined();
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(o.whyWrong, ex.key).toMatch(/kann stimmen/);
      });
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('groessen.was-passt hints', () => {
  it('a hint with known sizes never names the thing the task asks about', () => {
    for (const ex of byAb(wasPasstSkill, 1)) {
      const subject = /^(.+?) \d+ /.exec(ex.prompt)![1];
      for (const h of ex.hints) expect(h.startsWith(subject), `${ex.key}: ${h}`).toBe(false);
    }
  });

  it('a hint with known sizes never names a thing inside the asked word (Buch in Kinderbuch)', () => {
    let books = 0;
    for (const ex of byAb(wasPasstSkill)) {
      const asked = /:(?:einheit|wert|stimmt):([^:]+)/.exec(ex.key)?.[1].toLowerCase();
      if (!asked) continue;
      if (asked.includes('kinderbuch')) books++;
      const nouns = ex.hints.join(' ').match(/(?<=\b(?:Ein|Eine|Deine|Packung) )\p{Lu}\p{L}+/gu) ?? [];
      for (const noun of nouns) expect(asked.includes(noun.toLowerCase()), `${ex.key}: ${noun}`).toBe(false);
    }
    expect(books).toBeGreaterThan(3);
  });
});

describe('groessen.was-passt limits and wording', () => {
  it('seconds stay on Stufe 3 (§2.2): no task, option, hint or step below it names them', () => {
    const seconds = /\b\d+[ \u00A0]s\b|^s$|klatschen|Sekunde/;
    let later = 0;
    for (const ex of byAb(wasPasstSkill)) {
      const found = childTexts(ex).filter((t) => seconds.test(t));
      if (ex.stufe < 3) expect(found, ex.key).toEqual([]);
      else if (found.length > 0) later++;
    }
    expect(later).toBeGreaterThan(20);
  });

  it('below Stufe 3 a time task still has a known size for minutes and for hours', () => {
    let seen = 0;
    for (const ex of byAb(wasPasstSkill, 2).filter((e) => e.stufe < 3 && e.prompt.includes('dauert'))) {
      seen++;
      expect(ex.steps[0], ex.key).toBe('Eine Schulstunde dauert 45 min. Ein Kinofilm dauert etwa 2 h.');
      if (ex.answer.kind === 'choice') expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(2);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('a choice of units names its options as words for the screen reader', () => {
    for (const ex of byAb(wasPasstSkill, 1)) expect(unitChoiceProblems(ex)).toEqual([]);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(wasPasstSkill)) expect(pluralProblems(ex)).toEqual([]);
  });
});
