import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { STUFEN } from '../../core/types';
import { bugKey, tagFor } from '../errorFamilies';
import families from './families';
import topic from './index';
import phrases from './phrases';

// The same sweep as errorFamilies.test.ts, for this topic alone: that sweep loads every topic at once.
describe('daten: families', () => {
  it('every Bug id of every skill has a family, and every table entry is emitted', () => {
    const emitted = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 400; seed++) {
          for (const bug of skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, { subtractionMethod: 'abziehen', extras: true }).bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(bug.id)}`);
            expect(Object.keys(families), `${skill.id} ${bug.id}`).toContain(tagFor(skill.id, bug.id));
          }
        }
      }
    }
    const entries = Object.values(families).flatMap((bySkill) => Object.entries(bySkill).flatMap(([skillId, keys]) => keys.split(/\s+/).map((k) => `${skillId}|${k}`)));
    expect(entries.filter((e) => !emitted.has(e))).toEqual([]);
  });

  it('family ids carry the prefix, and every family has its phrase', () => {
    for (const id of Object.keys(families)) expect(id.startsWith('daten-'), id).toBe(true);
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
  });

  it('the catalogue skills stand in teaching order', () => {
    expect(topic.skills.map((s) => s.id)).toEqual(['daten.tabelle', 'daten.darstellen', 'daten.diagramme', 'daten.fahrplan', 'daten.kombinieren', 'daten.sicher-moeglich', 'daten.chancen']);
  });
});
