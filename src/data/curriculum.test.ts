// The notes for adults must match the code: what they call an Extra is marked optional, and what they gate is gated.
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import type { Exercise, SkillDef, Stufe } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { LAENDER_DIFFERENCES, isKmkTag, KMK_TAGS } from './curriculum';

/** The note on the adult page for each optional skill. */
const NOTE_OF_EXTRA: Record<string, string> = {
  'zahlen.tausenderbuch': 'Tausenderbuch',
  'schriftlich.multiplizieren': 'Schriftliches Malnehmen',
  'kopfrechnen.punkt-strich': 'Mal zuerst',
  'groessen.hohlmasse': 'Liter und Milliliter',
  'geometrie.parallel-senkrecht': 'Parallel und senkrecht',
  'sachaufgaben.genau-ungefaehr': 'Genau oder ungefähr',
};

async function allSkills(): Promise<SkillDef[]> {
  return (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
}

function sample(skill: SkillDef, extras: boolean, stufe: Stufe, n = 150, ab: 1 | 2 | 3 = 3): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 613 + stufe), stufe, { subtractionMethod: 'abziehen', extras, ab }));
}

describe('Länder notes on the adult page', () => {
  it('every note that says Extra belongs to an optional skill, and every optional skill has its note', async () => {
    const skills = await allSkills();
    const optional = skills.filter((s) => s.optional).map((s) => s.id).sort();
    expect(optional).toEqual(Object.keys(NOTE_OF_EXTRA).sort());
    const saysExtra = LAENDER_DIFFERENCES.filter((d) => /ein Extra\b/.test(d.text)).map((d) => d.topic).sort();
    expect(saysExtra).toEqual(Object.values(NOTE_OF_EXTRA).sort());
    // Core in the catalogue, though the Länder place them differently.
    for (const id of ['zahlen.runden', 'kopfrechnen.teilen-rest', 'geometrie.flaeche', 'geometrie.umfang', 'daten.chancen']) expect(skills.find((s) => s.id === id)?.optional, id).toBeUndefined();
  });

  it('what a note gates to Stufe 3 appears there, and only there', async () => {
    const skills = await allSkills();
    const skill = (id: string) => skills.find((s) => s.id === id)!;
    const has = (list: Exercise[], test: (ex: Exercise) => boolean) => list.some(test);
    const texts = (ex: Exercise) => JSON.stringify(ex.answer) + (ex.context ?? '') + ex.prompt;
    const wahrscheinlich = (ex: Exercise) => /(?<!un)wahrscheinlich/i.test(texts(ex));
    expect(LAENDER_DIFFERENCES.find((d) => d.topic === 'Wahrscheinlich')!.text).toMatch(/Stufe 3/);
    expect(has([1, 2, 3].flatMap((ab) => sample(skill('daten.sicher-moeglich'), false, 3, 150, ab as 1 | 2 | 3)), wahrscheinlich), 'Stufe 3').toBe(true);
    expect(has([1, 2, 3].flatMap((ab) => sample(skill('daten.sicher-moeglich'), false, 2, 150, ab as 1 | 2 | 3)), wahrscheinlich), 'Stufe 2').toBe(false);
    expect(has([1, 2, 3].flatMap((ab) => sample(skill('daten.sicher-moeglich'), false, 1, 150, ab as 1 | 2 | 3)), wahrscheinlich), 'Stufe 1').toBe(false);
  });
});

describe('KMK tags', () => {
  it('every tag is used by a skill, and a skill uses only known tags', async () => {
    const used = new Set((await allSkills()).flatMap((s) => s.kmk));
    for (const tag of used) expect(isKmkTag(tag), tag).toBe(true);
    const items = (await allSkills()).flatMap((s) => [1, 2, 3].flatMap((stufe) => sample(s, true, stufe as Stufe, 40)));
    const emitted = new Set([...used, ...items.flatMap((ex) => ex.kmk)]);
    for (const tag of Object.keys(KMK_TAGS)) expect(emitted.has(tag), tag).toBe(true);
  }, 60_000);
});
