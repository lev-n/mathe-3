import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { times } from '../test-utils';
import { byAb, conversionProblem, keysWithDecoration, pluralProblems } from './test-support';
import { zeitspannenSkill } from './zeitspannen';

describeSkill(zeitspannenSkill, { minDistinct: 30 });

/** The minutes of a duration in a story: '45 min' or '1 h 25 min'. */
function duration(text: string): number {
  const t = text.replace(/ /g, ' ');
  const h = /(\d+) h\b/.exec(t);
  const m = /(\d+) min\b/.exec(t);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

describe('groessen.zeitspannen', () => {
  it('worked solutions add up, and every expression recomputes to its answer', () => {
    for (const ex of byAb(zeitspannenSkill)) {
      expect(checkWorkedSolution(ex)).toEqual([]);
      expect(conversionProblem(ex), ex.key).toBeNull();
    }
  });

  it('stories recompute: end − start is the span, start + span the end', () => {
    let spans = 0;
    let ends = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      if (!ex.context || ex.key.includes(':stunden:')) continue;
      const a = ex.answer;
      const stamps = times(ex.context);
      if (a.kind === 'number') {
        spans++;
        expect(a.value, ex.key).toBe(stamps[1] - stamps[0]);
      } else if (a.kind === 'multi') {
        ends++;
        expect(a.fields[0].value * 60 + a.fields[1].value, ex.key).toBe(stamps[0] + duration(ex.context.split('dauert')[1]));
      }
    }
    expect(spans).toBeGreaterThan(50);
    expect(ends).toBeGreaterThan(50);
  });

  it('AB I stays inside one hour, AB II crosses a full hour', () => {
    for (const ex of byAb(zeitspannenSkill, 1)) {
      const [start, end] = times(ex.context!);
      if (end !== undefined) expect(Math.floor(start / 60), ex.key).toBe(Math.floor(end / 60));
    }
    const crossing = byAb(zeitspannenSkill, 2).filter((ex) => ex.key.includes('ueber'));
    expect(crossing.length).toBeGreaterThan(50);
    for (const ex of crossing) {
      const [start, end] = times(ex.context!);
      if (end !== undefined) expect(Math.floor(end / 60), ex.key).toBe(Math.floor(start / 60) + 1);
    }
  });

  it('13.50 Uhr plus 45 min as 13.95 Uhr is matched', () => {
    const ex = byAb(zeitspannenSkill, 2).find((e) => e.key.includes(':endeueber:'))!;
    const [start] = times(ex.context!);
    const span = duration(ex.context!.split('dauert')[1]);
    const bug = ex.bugs!.find((b) => b.id === 'stunde-100')!;
    expect(bug.match).toEqual({ h: Math.floor(start / 60), min: start % 60 + span });
  });

  it('whole hours: the wrong answer "the time" gets the Wie-lange hint', () => {
    const ex = byAb(zeitspannenSkill, 2).find((e) => e.key.includes(':stunden:'))!;
    expect(ex.bugs!.find((b) => b.id === 'zeitpunkt-spanne')!.hint).toMatch(/Wie lange/);
  });

  it('time lines jump along real times', () => {
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      for (const step of ex.steps) {
        if (typeof step === 'string' || step.visual?.type !== 'numberLine') continue;
        seen++;
        expect(step.visual.time, ex.key).toBe(true);
        expect((step.visual.jumps ?? []).length, ex.key).toBeGreaterThan(0);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the two jump labels across a full hour stay apart on the line, and the full hour is a long tick', () => {
    // As JumpArc draws them: 340 units of line, bold 16 px labels at the middle of each jump.
    const labelWidth = (label: string) => label.length * 16 * 0.58 + 4;
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      for (const step of ex.steps) {
        if (typeof step === 'string' || step.visual?.type !== 'numberLine' || step.visual.jumps?.length !== 2) continue;
        seen++;
        const v = step.visual;
        const [a, b] = v.jumps!;
        const x = (t: number) => ((t - v.min) / (v.max - v.min)) * 340;
        const apart = x((b.from + b.to) / 2) - x((a.from + a.to) / 2);
        expect(apart, ex.key).toBeGreaterThanOrEqual((labelWidth(a.label!) + labelWidth(b.label!)) / 2);
        expect((a.to - v.min) % v.majorStep, ex.key).toBe(0);
        expect(a.from >= v.min && b.to <= v.max, ex.key).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('seconds stay on Stufe 3 (§2.2)', () => {
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      const has = /\b\d+[ \u00A0]s\b/.test(ex.expression ?? '') || ex.key.includes(':smin:');
      if (ex.stufe < 3) expect(has, ex.key).toBe(false);
      else if (has) seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('whole-hour tasks fit the event: a film stays short, only a day trip lasts 7 hours', () => {
    const longest: Readonly<Record<string, number>> = { Film: 3, Spiel: 3, Probe: 3, Kurs: 4, Führung: 3, Konzert: 3, Turnen: 2, Ausflug: 7, Wanderung: 6, Schulfest: 5 };
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      if (!ex.context || !ex.key.includes(':stunden:') || ex.answer.kind !== 'number') continue;
      seen++;
      const noun = /^\S+ (\S+)/.exec(ex.context)![1];
      expect(ex.answer.value, ex.key).toBeLessThanOrEqual(longest[noun]);
      if (noun === 'Film' || noun === 'Konzert') expect(Number(/um (\d+)/.exec(ex.context)![1]), ex.key).toBeGreaterThanOrEqual(14);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('spans under an hour fit the event and its time of day: no film of 7 minutes, no concert at 8 Uhr', () => {
    const fits: Readonly<Record<string, readonly [shortest: number, longest: number, first: number, last: number]>> = {
      Busfahrt: [5, 55, 8, 17], Aufräumen: [5, 30, 8, 17], Vorlesen: [5, 30, 8, 17], Pause: [5, 30, 9, 13], Spaziergang: [10, 55, 9, 17],
      Spiel: [15, 55, 9, 16], Probe: [20, 55, 9, 16], Turnen: [20, 55, 8, 16], Führung: [20, 55, 9, 15], Kurs: [30, 55, 8, 14],
    };
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill)) {
      if (!/:(spanne|ende|spanneueber|endeueber):/.test(ex.key)) continue;
      seen++;
      const noun = /^\S+ (\S+)/.exec(ex.context!)![1];
      const [start, end] = times(ex.context!);
      const span = end !== undefined ? end - start : duration(ex.context!.split('dauert')[1]);
      expect(noun in fits, `${ex.key}: ${ex.context}`).toBe(true);
      const [shortest, longest, first, last] = fits[noun];
      expect(span >= shortest && span <= longest, `${ex.key}: ${ex.context}`).toBe(true);
      expect(Math.floor(start / 60) >= first && Math.floor(start / 60) <= last, `${ex.key}: ${ex.context}`).toBe(true);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a longer span with minutes starts at an hour that fits the event', () => {
    const hours: Readonly<Record<string, readonly [first: number, last: number]>> = { Film: [14, 18], Spiel: [9, 16], Probe: [9, 16], Kurs: [8, 14], Führung: [9, 15], Konzert: [15, 18], Turnen: [8, 16] };
    let seen = 0;
    for (const ex of byAb(zeitspannenSkill).filter((e) => e.key.includes(':lang:'))) {
      seen++;
      const [first, last] = hours[/^\S+ (\S+)/.exec(ex.context!)![1]];
      const h = Math.floor(times(ex.context!)[0] / 60);
      expect(h >= first && h <= last, `${ex.key}: ${ex.context}`).toBe(true);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('the value 1 takes the singular in every text', () => {
    for (const ex of byAb(zeitspannenSkill)) expect(pluralProblems(ex)).toEqual([]);
  });

  it('a longer span with minutes stays below the longest of the event', () => {
    for (const ex of byAb(zeitspannenSkill)) {
      if (ex.key.includes(':lang:') && ex.context!.startsWith('Das Turnen')) expect(duration(ex.context!.split('dauert')[1]), ex.key).toBeLessThan(120);
    }
  });

  it('the event is decoration: the same times under another event have the same key', () => {
    const stories = byAb(zeitspannenSkill).filter((e) => e.context);
    const numbers = (ex: (typeof stories)[number]) => `${[...(ex.context ?? '').matchAll(/\d+/g)].join(':')}|${ex.prompt.split(' ')[0]}|${ex.answer.kind}`;
    expect(keysWithDecoration(stories, numbers)).toEqual([]);
  });
});
