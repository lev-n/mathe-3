import { describe, expect, it } from 'vitest';
import { roundSize } from '../../core/age';
import { createRng } from '../../core/rng';
import { STUFEN, type GenContext } from '../../core/types';
import { bugKey, tagFor } from '../errorFamilies';
import families from './families';
import phrases from './phrases';
import topic from './index';
import { everything, mentionsNumber } from './test-helpers';

const CATALOGUE = [
  ['schriftlich.stellengerecht', 'Richtig untereinander', 'Du schreibst Einer unter Einer und Zehner unter Zehner.'],
  ['schriftlich.addieren', 'Plus ohne Übertrag', 'Du rechnest von den Einern aus Stelle für Stelle.'],
  ['schriftlich.addieren-uebertrag', 'Plus mit Übertrag', 'Du trägst einen vollen Zehner in die nächste Spalte.'],
  ['schriftlich.subtrahieren', 'Minus ohne Übertrag', 'Du rechnest von den Einern aus untereinander minus.'],
  ['schriftlich.subtrahieren-uebertrag', 'Minus mit Übertrag', 'Du rechnest minus, auch wenn oben zu wenig steht.'],
  ['schriftlich.null', 'Minus mit Null', 'Du rechnest sicher, auch wenn oben eine Null steht.'],
  ['schriftlich.pruefen', 'Überschlagen und prüfen', 'Du schätzt vorher und prüfst nachher dein Ergebnis.'],
  ['schriftlich.kopf-oder-schriftlich', 'Im Kopf oder schriftlich?', 'Du entscheidest, welcher Weg hier leichter ist.'],
  ['schriftlich.multiplizieren', 'Mal schriftlich', 'Du rechnest eine große Zahl mal eine kleine Zahl.'],
];

const ALL_ITEMS = () => topic.skills.flatMap((skill) => everything(skill, 80));

describe('the whole topic', () => {
  it('a tap writes and places nothing: the praise of a choice names what the child really did', () => {
    for (const ex of ALL_ITEMS()) {
      if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(/schrieben|gesetzt|gestellt|gelegt|geordnet|eingetragen|getippt|erklärt/);
    }
  });

  it('no task states its answer in the prompt or the expression, and no Perfekt in a question (T6)', () => {
    for (const ex of ALL_ITEMS()) {
      const task = `${ex.prompt} ${ex.expression ?? ''}`;
      const a = ex.answer;
      const value = a.kind === 'written' ? a.result : a.kind === 'number' ? a.value : null;
      if (value !== null && value >= 10) expect(mentionsNumber(task, value), `${ex.key}: ${task}`).toBe(false);
      expect(ex.prompt, ex.key).not.toMatch(/passiert\?/);
    }
  });
});

describe('topic schriftlich', () => {
  it('has the skills of the catalogue in teaching order, word for word', () => {
    expect(topic.skills.map((s) => [s.id, s.title, s.description])).toEqual(CATALOGUE);
  });

  it('a round has 8 items', () => {
    expect(roundSize('schriftlich')).toBe(8);
  });

  it('only Mal schriftlich is optional', () => {
    expect(topic.skills.filter((s) => s.optional).map((s) => s.id)).toEqual(['schriftlich.multiplizieren']);
  });

  it('the skills with written minus ask for the method', () => {
    expect(topic.skills.filter((s) => s.usesMethod).map((s) => s.id)).toEqual(['schriftlich.subtrahieren', 'schriftlich.subtrahieren-uebertrag', 'schriftlich.null', 'schriftlich.pruefen', 'schriftlich.kopf-oder-schriftlich']);
  });

  it('family ids carry the prefix of the topic and have a phrase', () => {
    for (const id of Object.keys(families)) {
      expect(id.startsWith('schriftlich-'), id).toBe(true);
      expect(phrases[id], id).toBeDefined();
    }
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
  });

  it('a phrase fits both subtraction methods: no Sprechweise of one of them (T12)', () => {
    for (const [id, { phrase }] of Object.entries(phrases)) {
      expect(`${phrase.object} ${phrase.participle}`, id).not.toMatch(/oben minus unten|über die 0|wechsel|wechsle|entbünd|erweiter|ergänz|abzieh/i);
    }
  });

  it('the sweep of errorFamilies.test.ts, for this topic alone: no Bug id without a family, no family entry without a Bug id', () => {
    const emitted = new Set<string>();
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 400; seed++) {
          // that sweep sets no method: a generator has to fall back to Abziehen
          const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, { extras: true, today: '2026-10-19' } as GenContext);
          for (const b of ex.bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(b.id)}`);
            const tag = tagFor(skill.id, b.id) as string;
            if (!Object.hasOwn(families, tag) || !Object.hasOwn(families[tag], skill.id)) unmapped.add(`${skill.id} ${b.id}`);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    const entries = Object.values(families).flatMap((skills) => Object.entries(skills).flatMap(([skillId, keys]) => keys.split(/\s+/).map((key) => `${skillId}|${key}`)));
    expect(entries.filter((k) => !emitted.has(k))).toEqual([]);
  }, 60_000);

  it('every Bug id of both methods, on a wider sweep than the shared test, has a family of its skill', () => {
    const unmapped = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const subtractionMethod of ['abziehen', 'ergaenzen'] as const) {
          for (let seed = 1; seed <= 1500; seed++) {
            const ex = skill.generate(createRng(seed * 31337 + stufe), stufe, { subtractionMethod, extras: true });
            for (const b of ex.bugs ?? []) {
              const tag = tagFor(skill.id, b.id) as string;
              if (!Object.hasOwn(families, tag) || !Object.hasOwn(families[tag], skill.id)) unmapped.add(`${skill.id} ${b.id} ${subtractionMethod}`);
            }
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    // 81000 items: alone about 2 s, but over the default 5 s when the whole suite runs on a busy machine
  }, 60_000);
});
