import { describe, expect, it } from 'vitest';
import { numberWord } from '../../core/format';
import { describeSkill } from '../../core/testing';
import type { AnswerOf, Exercise } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { ZELLEN, expectScope, kindOf, samplesIn, samplesOf, solutionProblems, stepText } from './testHelp';
import { verwechslungen, zahlwortSkill } from './zahlwort';

describeSkill(zahlwortSkill);

/** Independent parser for German number words up to 9999, so the generator's words are checked against something else. */
const UNITS: Record<string, number> = { ein: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const TEENS: Record<string, number> = { zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const TENS: Record<string, number> = { zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
function liesRest(s: string): number {
  if (s === '') return 0;
  if (s in TEENS) return TEENS[s];
  if (s in TENS) return TENS[s];
  const u = s.indexOf('und');
  return u > 0 ? UNITS[s.slice(0, u)] + TENS[s.slice(u + 3)] : UNITS[s];
}
function liesWort(raw: string): number {
  let s = raw.replace(/­/g, '');
  let n = 0;
  const t = s.indexOf('tausend');
  if (t >= 0) {
    n += UNITS[s.slice(0, t)] * 1000;
    s = s.slice(t + 7);
  }
  const h = s.indexOf('hundert');
  if (h >= 0) {
    n += UNITS[s.slice(0, h)] * 100;
    s = s.slice(h + 7);
  }
  return n + liesRest(s);
}

const correctLabel = (ex: Exercise) => {
  const a = ex.answer as AnswerOf<'choice'>;
  return a.options[a.correct].label;
};
const labels = (ex: Exercise) => (ex.answer as AnswerOf<'choice'>).options.map((o) => o.label);
/** The number in the table of "number to word". */
function tafelZahl(ex: Exercise): number {
  if (ex.visual?.type !== 'placeValue') throw new Error(`${ex.key} without a table`);
  return Number(ex.visual.rows[0].values.join(''));
}

const wert = (ex: Exercise) => (ex.answer as AnswerOf<'number'>).value!;
const felder = (ex: Exercise) => (ex.answer as AnswerOf<'multi'>).fields.map((f) => f.value);
const nullen = (n: number) => [...String(n)].filter((d) => d === '0').length;

describe('zahlen.zahlwort', () => {
  it('each Stufe and AB level has the forms of that Stufe', () => {
    expectScope(zahlwortSkill, {
      1: { 1: ['wahl1'], 2: ['stelle', 'wahl1'], 3: ['stellen'] },
      2: { 1: ['wahl2'], 2: ['tippen'], 3: ['nullstelle', 'tippen'] },
      3: { 1: ['tippen'], 2: ['zuwort'], 3: ['tippen', 'zuwort'] },
    });
  });

  it('the parser reads tricky words', () => {
    expect(liesWort('dreihundertfünf')).toBe(305);
    expect(liesWort('neunhunderteinundfünfzig')).toBe(951);
    expect(liesWort('dreihunderteins')).toBe(301);
    expect(liesWort('eintausend')).toBe(1000);
    expect(liesWort('dreitausendfünf')).toBe(3005);
  });

  it('the look-alikes compute exactly from their pattern (§5)', () => {
    const of = (n: number) => Object.fromEntries(verwechslungen(n).map((v) => [v.id, v.value]));
    expect(of(305)).toEqual({ 'zahlwort-anhaengen': 3005, 'null-vergessen': 35, 'null-falsche-stelle': 350 });
    expect(of(350)).toEqual({ 'zahlwort-anhaengen': 30050, 'null-vergessen': 35, 'null-falsche-stelle': 305 });
    expect(of(951)).toEqual({ 'zahlwort-anhaengen': 90051, zahlendreher: 915 });
    expect(of(345)).toEqual({ 'zahlwort-anhaengen': 30045, zahlendreher: 354 });
  });

  it('every shown word belongs to the answer', () => {
    for (const ex of samplesIn(zahlwortSkill, ZELLEN, 200)) {
      const kind = kindOf(ex);
      if (kind === 'wahl1' || kind === 'wahl2') expect(liesWort(ex.expression!)).toBe(Number(correctLabel(ex)));
      if (kind === 'tippen') expect(liesWort(ex.expression!)).toBe(wert(ex));
      if (kind === 'zuwort') {
        expect(liesWort(correctLabel(ex))).toBe(tafelZahl(ex));
        for (const label of labels(ex)) if (label !== correctLabel(ex)) expect(liesWort(label)).not.toBe(tafelZahl(ex));
      }
      if (kind === 'stelle') {
        const n = liesWort(ex.expression!);
        expect(wert(ex)).toBe(/Zehner/.test(ex.prompt) ? Math.floor(n / 10) % 10 : n % 10);
      }
      if (kind === 'stellen') {
        const n = liesWort(ex.expression!);
        expect(felder(ex)).toEqual([Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10]);
      }
      if (kind === 'nullstelle') {
        const n = liesWort(ex.expression!);
        expect(correctLabel(ex)).toBe(n % 10 === 0 ? 'Einer' : 'Zehner');
        expect(nullen(n)).toBe(1);
      }
    }
  });

  it('options the child has to read stay silent', () => {
    for (const ex of samplesIn(zahlwortSkill, ZELLEN)) if (ex.answer.kind === 'choice') expect(ex.answer.silentOptions, ex.key).toBe(true);
  });

  it('Stufe 1: no word has a zero at any AB level', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(zahlwortSkill, 1, ab, 300)) {
        expect(String(liesWort(ex.expression!)), ex.key).not.toContain('0');
        expect(kindOf(ex), 'typing the whole number belongs to Stufe 2 and 3').not.toBe('tippen');
      }
    }
  });

  it('Stufe 1, AB I: plain words, and no option is a look-alike; AB II has the words with a teen', () => {
    for (const ex of samplesOf(zahlwortSkill, 1, 1)) {
      const n = correctLabel(ex);
      expect(Number(n[1]), ex.key).toBeGreaterThanOrEqual(2);
      for (const label of labels(ex)) {
        if (label === n) continue;
        expect(label[0]).not.toBe(n[0]);
        expect(label[1]).not.toBe(n[1]);
        expect(label[2]).not.toBe(n[2]);
      }
      expect(labels(ex).length).toBeLessThanOrEqual(4);
    }
    let teens = 0;
    for (const ex of samplesOf(zahlwortSkill, 1, 2)) {
      if (kindOf(ex) !== 'wahl1') continue;
      teens++;
      expect(correctLabel(ex)[1], ex.key).toBe('1');
      for (const label of labels(ex)) if (label !== correctLabel(ex)) expect(label[0]).not.toBe(correctLabel(ex)[0]);
    }
    expect(teens).toBeGreaterThan(30);
  });

  it('asking for a place: the last step states the answer with its place', () => {
    let seen = 0;
    for (const ex of samplesOf(zahlwortSkill, 1, 2, 300)) {
      if (kindOf(ex) !== 'stelle') continue;
      seen++;
      const a = ex.answer as AnswerOf<'number'>;
      expect(stepText(ex.steps[ex.steps.length - 1]), ex.key).toMatch(new RegExp(`(?<!\\d)${a.value} ${a.unit}\\.$`));
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('Stufe 2: every word has a zero at every AB level (§6, and the Stufe line)', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of samplesOf(zahlwortSkill, 2, ab, 300)) expect(nullen(liesWort(ex.expression!)), ex.key).toBeGreaterThanOrEqual(1);
    }
  });

  it('Stufe 2, AB I: the options contain look-alikes (305, 350, 3005), and one place is left out', () => {
    for (const ex of samplesOf(zahlwortSkill, 2, 1)) {
      const n = Number(correctLabel(ex));
      for (const label of labels(ex)) if (Number(label) !== n) expect(verwechslungen(n).map((v) => v.value)).toContain(Number(label));
      expect(labels(ex).length).toBeGreaterThanOrEqual(2);
      expect(nullen(n), ex.key).toBe(1);
    }
  });

  it('Stufe 2, AB II: typed with one zero; AB III: the hardest words with a zero (two zeros, x01, x10), never 1000', () => {
    for (const ex of samplesOf(zahlwortSkill, 2, 2)) expect(nullen(wert(ex)), ex.key).toBe(1);
    const werte = samplesOf(zahlwortSkill, 2, 3, 300).filter((ex) => kindOf(ex) === 'tippen').map(wert);
    for (const n of werte) expect(n).toBeLessThan(1000);
    expect(werte.some((n) => n % 100 === 0)).toBe(true);
    expect(werte.some((n) => n % 100 === 1)).toBe(true);
    expect(werte.some((n) => n % 100 === 10)).toBe(true);
  });

  it('number to word and the prompt to listen stay on Stufe 3', () => {
    for (const s of [1, 2] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of samplesOf(zahlwortSkill, s, ab)) {
          expect(kindOf(ex)).not.toBe('zuwort');
          expect(ex.prompt, ex.key).not.toMatch(/^Hör/);
        }
      }
    }
  });

  it('typing on Stufe 3 has other numbers than Stufe 2, and harder words: the word stays on screen, so the task must not be the one of Stufe 2', () => {
    const stufe2 = new Set(samplesIn(zahlwortSkill, [[2, 2], [2, 3]], 600).filter((ex) => kindOf(ex) === 'tippen').map(wert));
    const schwer = (n: number) => Math.floor(n / 10) % 10 === 1 || [3, 6, 7].includes(Math.floor(n / 10) % 10);
    for (const ex of samplesIn(zahlwortSkill, [[3, 1], [3, 3]], 600)) {
      if (kindOf(ex) !== 'tippen') continue;
      const n = wert(ex);
      expect(stufe2.has(n), ex.key).toBe(false);
      expect(ex.expression, ex.key).toBeDefined();
      if (ex.ab === 1) {
        expect(schwer(n), ex.key).toBe(true);
        expect(String(n), ex.key).not.toContain('0');
      }
    }
  });

  it('Stufe 3, AB III typing is the hardest: elf, zwölf, sechzehn, siebzehn, the same digit in front and behind, 1000', () => {
    for (const ex of samplesOf(zahlwortSkill, 3, 3, 600)) {
      if (kindOf(ex) !== 'tippen') continue;
      const n = wert(ex);
      const rest = n % 100;
      expect(n === 1000 || [11, 12, 16, 17].includes(rest) || Math.floor(n / 100) === n % 10, ex.key).toBe(true);
    }
  });

  it('options stay in the range of the task: number words below 1000, look-alikes up to the 3005 of the catalogue', () => {
    for (const ex of samplesIn(zahlwortSkill, [[3, 2], [3, 3]], 400)) {
      if (kindOf(ex) !== 'zuwort') continue;
      expect(labels(ex).length, ex.key).toBeGreaterThanOrEqual(3);
      for (const label of labels(ex)) {
        expect(liesWort(label), ex.key).toBeGreaterThanOrEqual(100);
        expect(liesWort(label), ex.key).toBeLessThan(1000);
      }
      const erstesWort = (label: string) => Math.floor(liesWort(label) / 100);
      // the first word alone does not decide
      expect(labels(ex).filter((l) => erstesWort(l) === erstesWort(correctLabel(ex))).length, ex.key).toBeGreaterThanOrEqual(2);
    }
    for (const ex of samplesOf(zahlwortSkill, 2, 1, 400)) for (const label of labels(ex)) expect(Number(label), ex.key).toBeLessThan(10000);
  });

  it('Stufe 3, AB I: typed from the word; AB II: number to word; AB III: the hardest numbers in both', () => {
    for (const ex of samplesOf(zahlwortSkill, 3, 1)) {
      expect(ex.prompt).toMatch(/^Hör/);
      expect(wert(ex)).toBeLessThan(1000);
    }
    for (const ex of samplesOf(zahlwortSkill, 3, 2)) expect(tafelZahl(ex)).toBeLessThan(1000);
    const getippt = samplesOf(zahlwortSkill, 3, 3, 300).filter((ex) => kindOf(ex) === 'tippen').map(wert);
    expect(getippt).toContain(1000);
    expect(getippt.some((n) => Math.floor(n / 10) % 10 === 1)).toBe(true);
    const gewaehlt = samplesOf(zahlwortSkill, 3, 3, 300).filter((ex) => kindOf(ex) === 'zuwort').map(tafelZahl);
    expect(gewaehlt.some((n) => n % 100 === 0)).toBe(true);
    for (const n of gewaehlt) expect(n).toBeLessThan(1000);
  });

  it('number to word: Vorlesen and the screen reader do not say the word to find', () => {
    let seen = 0;
    for (const ex of samplesIn(zahlwortSkill, [[3, 2], [3, 3]], 300)) {
      if (kindOf(ex) !== 'zuwort') continue;
      seen++;
      const word = numberWord(tafelZahl(ex));
      expect(taskSpeech(ex), ex.key).not.toContain(word);
      expect(ex.srText, ex.key).not.toContain(String(tafelZahl(ex)));
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('a large word breaks only between its parts, and never inside hundert', () => {
    const words = samplesIn(zahlwortSkill, ZELLEN, 300).flatMap((ex) => [ex.expression ?? '', ...(kindOf(ex) === 'zuwort' ? labels(ex) : [])]).filter((t) => /^\p{L}/u.test(t));
    expect(words.length).toBeGreaterThan(500);
    for (const word of words) {
      // no piece is longer than 'dreizehn': it fits one line of the task's type, measured down to a 320 px phone
      for (const piece of word.split('­')) expect(piece.length, word).toBeLessThanOrEqual(8);
      if (word.includes('hundert')) expect(word).not.toMatch(/h­|hund­/);
    }
    const siebenundsechzig = samplesOf(zahlwortSkill, 3, 1, 300).map((ex) => ex.expression ?? '').find((t) => t.includes('und­'));
    expect(siebenundsechzig).toMatch(/­und­/);
  });

  it('the word is on screen, also where the task asks to listen: Vorlesen can be hidden', () => {
    for (const ex of samplesIn(zahlwortSkill, [[3, 1], [3, 3]])) if (kindOf(ex) === 'tippen') expect(liesWort(ex.expression!)).toBeGreaterThan(0);
  });

  it('the hints fit the word: zeros where a place is missing, Zehner before Einer where none is', () => {
    let ohneNull = 0;
    for (const ex of samplesIn(zahlwortSkill, [[2, 1], [2, 2], [2, 3], [3, 1], [3, 3]], 400)) {
      if (kindOf(ex) !== 'tippen' && kindOf(ex) !== 'wahl2') continue;
      const n = kindOf(ex) === 'wahl2' ? Number(correctLabel(ex)) : wert(ex);
      if (String(n).includes('0')) {
        expect(ex.hints.join(' '), ex.key).toMatch(/0|Nullen/);
      } else {
        ohneNull++;
        expect(ex.hints.join(' '), ex.key).not.toMatch(/ 0\b/);
        expect(ex.hints[1], ex.key).toMatch(/Zehner/);
      }
    }
    expect(ohneNull).toBeGreaterThan(50);
  });

  it('elf and zwölf do not say their Einer first, so no hint claims that', () => {
    const zuerst = /Einer zuerst|Zehner hörst du am Ende/;
    for (const n of [311, 312]) for (const v of verwechslungen(n)) expect(v.hint, `${n}`).not.toMatch(zuerst);
    let seen = 0;
    for (const ex of samplesIn(zahlwortSkill, ZELLEN, 500)) {
      if (!/(elf|zwölf)$/.test((ex.expression ?? '').replace(/­/g, ''))) continue;
      seen++;
      for (const hint of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(hint, ex.key).not.toMatch(zuerst);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('praise names what the child did: a tap writes nothing, full hundreds have two zeros', () => {
    let hunderter = 0;
    for (const ex of samplesIn(zahlwortSkill, ZELLEN, 300)) {
      if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/geschrieben|gesetzt/);
      if (kindOf(ex) !== 'tippen') continue;
      const n = wert(ex);
      if (n < 1000 && n % 100 === 0) {
        hunderter++;
        expect(ex.praise, ex.key).toContain('2 Nullen');
      }
      if (n % 100 !== 0 && String(n).includes('0')) expect(ex.praise, ex.key).toContain('die Null');
      if (!String(n).includes('0')) expect(ex.praise, ex.key).toContain('Zehner');
    }
    expect(hunderter).toBeGreaterThan(5);
  });

  it('worked solutions compute', () => {
    expect(solutionProblems(zahlwortSkill)).toEqual([]);
  });
});
