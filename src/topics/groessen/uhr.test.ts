import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { byAb, pluralProblems } from './test-support';
import { uhrSkill } from './uhr';

describeSkill(uhrSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const WORD = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];

const timeOf = (label: string) => /(\d+)\.(\d\d)/.exec(label)!.slice(1).map(Number);

describe('groessen.uhr', () => {
  it('worked solutions add up', () => {
    for (const ex of byAb(uhrSkill)) expect(checkWorkedSolution(ex)).toEqual([]);
  });

  it('reading a clock: the answer is the time the clock shows', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill)) {
      const a = ex.answer;
      if (ex.visual?.type !== 'clock' || ex.key.includes(':sagen:')) continue;
      seen++;
      if (a.kind === 'multi') {
        expect([a.fields[0].value, a.fields[1].value], ex.key).toEqual([ex.visual.hours, ex.visual.minutes]);
      } else if (a.kind === 'choice') {
        expect(timeOf(a.options[a.correct].label), ex.key).toEqual([ex.visual.hours, ex.visual.minutes]);
      } else if (a.kind === 'number') {
        expect((a.value as number) * 5, ex.key).toBe(ex.visual.minutes);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('AB I stays on five-minute steps; AB II reads exact minutes on a clock without digital display', () => {
    for (const ex of byAb(uhrSkill, 1)) if (ex.visual?.type === 'clock') expect(ex.visual.minutes % 5, ex.key).toBe(0);
    for (const ex of byAb(uhrSkill, 2)) {
      if (ex.visual?.type !== 'clock') throw new Error('clock expected');
      if (ex.stufe > 1) expect(ex.visual.minutes % 5, ex.key).not.toBe(0);
      expect(ex.visual.showDigital, ex.key).toBeUndefined();
    }
  });

  it('Stufe 1 stays on five-minute steps at every AB level (G17)', () => {
    for (const ex of byAb(uhrSkill).filter((e) => e.stufe === 1)) {
      const a = ex.answer;
      const clocks = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual)), ...(a.kind === 'choice' ? a.options.map((o) => o.visual) : [])];
      for (const c of clocks) if (c?.type === 'clock') expect(c.minutes % 5, ex.key).toBe(0);
      if (a.kind === 'multi') expect(a.fields[1].value % 5, ex.key).toBe(0);
    }
  });

  it('Stufe 1 and AB I show the clock beside its digital display in the worked solution, the other tasks stay analog (G17, §6)', () => {
    for (const ex of byAb(uhrSkill)) {
      const digital = ex.steps.filter((s) => typeof s !== 'string' && s.visual?.type === 'clock' && s.visual.showDigital);
      if (ex.stufe === 1 || ex.ab === 1) expect(digital.length, ex.key).toBeGreaterThan(0);
      else expect(digital, ex.key).toEqual([]);
    }
  });

  it('a task shows the digital display only where it does not give the answer away', () => {
    let onStufe1 = 0;
    for (const ex of byAb(uhrSkill)) {
      if (ex.visual?.type !== 'clock' || !ex.visual.showDigital) continue;
      expect(ex.key, ex.key).toContain(':sagen:');
      expect(ex.ab, ex.key).toBe(1);
      const a = ex.answer;
      if (a.kind !== 'choice') throw new Error('choice expected');
      for (const o of a.options) expect(o.label, ex.key).not.toMatch(/\d/);
      expect(ex.srText, ex.key).toContain('Die Anzeige zeigt');
      if (ex.stufe === 1) onStufe1++;
    }
    expect(onStufe1).toBeGreaterThan(5);
  });

  it('saying the time: the right words belong to the time on the clock', () => {
    const spoken: Readonly<Record<number, (h: number) => string>> = { 15: (h) => `Viertel nach ${WORD[h]}`, 30: (h) => `halb ${WORD[h + 1]}`, 45: (h) => `Viertel vor ${WORD[h + 1]}` };
    for (const ex of byAb(uhrSkill, 1).filter((e) => e.key.includes(':sagen:'))) {
      const a = ex.answer;
      if (a.kind !== 'choice' || ex.visual?.type !== 'clock') throw new Error('choice with a clock expected');
      expect(a.options[a.correct].label, ex.key).toBe(spoken[ex.visual.minutes](ex.visual.hours));
    }
  });

  it('reading a clock names the time of day, and the same hands in the other half of the day get a hint', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill)) {
      if (!ex.key.includes(':lesen:') || ex.answer.kind !== 'multi') continue;
      seen++;
      expect(ex.prompt, ex.key).toMatch(/^Es ist (Morgen|Vormittag|Mittag)\. Wie spät ist es\?$/);
      const [h, min] = [ex.answer.fields[0].value, ex.answer.fields[1].value];
      if (h === 12) continue;
      const r = checkAnswer(ex.answer, { kind: 'multi', values: { h: String(h + 12), min: String(min) } }, ex.bugs);
      expect(r.correct, ex.key).toBe(false);
      expect(r.bugHint, ex.key).toMatch(/am Abend/);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('asking for the number of the long hand does not show that hand', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill, 1)) {
      if (!ex.key.includes(':zahl:')) continue;
      seen++;
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.srText, ex.key).not.toMatch(/Der lange Zeiger (zeigt|steht)/);
      expect(ex.steps.some((s) => typeof s !== 'string' && s.visual?.type === 'clock'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('the value 1 takes the singular in every text', () => {
    const sample = byAb(uhrSkill, 1)[0];
    for (const line of ['Das sind 1 Minute.', 'Von 19,00 € bis 20,00 € sind es 1 €.']) expect(pluralProblems({ ...sample, steps: [line] }).length, line).toBe(1);
    for (const ex of byAb(uhrSkill)) expect(pluralProblems(ex)).toEqual([]);
    const lines = byAb(uhrSkill, 3).filter((e) => e.key.includes(':pm:')).flatMap((e) => e.steps.map((s) => (typeof s === 'string' ? s : s.text)));
    expect(lines.filter((l) => /zeigt 0 Minuten/.test(l))).toEqual([]);
  });

  it('AB III: the right clock shows the asked time, the others differ on the face', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'choice') continue;
      seen++;
      const [h, m] = timeOf(ex.prompt);
      const right = a.options[a.correct].visual;
      expect(right, ex.key).toEqual({ type: 'clock', hours: h, minutes: m });
      const faces = a.options.map((o) => (o.visual?.type === 'clock' ? `${o.visual.hours % 12}:${o.visual.minutes}` : ''));
      expect(new Set(faces).size, ex.key).toBe(faces.length);
      expect(a.options.map((o) => o.label)).toEqual(['Uhr A', 'Uhr B', 'Uhr C', 'Uhr D']);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('24-hour tasks answer past 12, and the bug is the time without the 12', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'multi') continue;
      seen++;
      expect(a.fields[0].value, ex.key).toBeGreaterThan(12);
      expect(ex.bugs!.find((b) => b.id === 'ohne-12')!.match, ex.key).toEqual({ h: a.fields[0].value - 12, min: a.fields[1].value });
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('spoken times: halb neun is 8.30 Uhr', () => {
    let seen = 0;
    for (const ex of byAb(uhrSkill, 1)) {
      const a = ex.answer;
      if (a.kind !== 'choice' || !ex.key.includes(':sprechen:')) continue;
      seen++;
      const [, h, m] = /sprechen:(\d+):(\d+)/.exec(ex.key)!.map(Number);
      expect(timeOf(a.options[a.correct].label)).toEqual([h, m]);
    }
    expect(seen).toBeGreaterThan(10);
  });
});
