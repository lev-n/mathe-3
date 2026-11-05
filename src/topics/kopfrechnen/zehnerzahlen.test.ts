import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { samples } from '../test-utils';
import { formOf, itRecomputes, itStaysReadable } from './testkit';
import { zehnerzahlenSkill } from './zehnerzahlen';

describeSkill(zehnerzahlenSkill);

describe('kopfrechnen.zehnerzahlen', () => {
  itRecomputes(zehnerzahlenSkill);
  itStaysReadable(zehnerzahlenSkill);

  const find = (stufe: 1 | 2 | 3, expression: string) => {
    const hit = samples(zehnerzahlenSkill, stufe, 8000).find((e) => e.expression === expression);
    if (!hit) throw new Error(expression);
    return hit;
  };

  it('Stufe 1 multiplies and divides by 10 and 100', () => {
    for (const ex of samples(zehnerzahlenSkill, 1)) {
      if (formOf(ex) === 'luecke') continue;
      expect(ex.expression, ex.key).toMatch(/(\b10\b|\b100\b)/);
    }
  });

  it('products stay within 1000', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zehnerzahlenSkill, stufe)) {
        for (const m of (ex.expression ?? '').matchAll(/\d+/g)) expect(Number(m[0]), ex.key).toBeLessThanOrEqual(1000);
        if (ex.answer.kind === 'number') expect(ex.answer.value as number, ex.key).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('Stufe 3 has the missing factor and division by a Zehnerzahl', () => {
    const forms = new Set(samples(zehnerzahlenSkill, 3).map(formOf));
    for (const f of ['z-luecke', 'durch-z']) expect(forms).toContain(f);
  });

  it('counts the Nullen right when the first number is a full hundred', () => {
    const items = samples(zehnerzahlenSkill, 3, 2000).filter((e) => formOf(e) === 'durch-z');
    expect(items.length).toBeGreaterThan(0);
    for (const ex of items) {
      const hint = ex.bugs?.find((b) => b.id === 'null-zu-viel')?.hint;
      expect(hint, ex.key).toMatch(/^Bei \d+ und \d+ fällt je eine Null weg, nicht nur bei \d+\.$/);
    }
    expect(find(3, '400 : 50 = □').bugs?.find((b) => b.id === 'null-zu-viel')?.hint).toBe('Bei 400 und 50 fällt je eine Null weg, nicht nur bei 50.');
  });

  it('computes the §5 bugs on the examples of the catalogue', () => {
    const mal = find(2, '6 · 40 = □');
    expect(mal.bugs?.find((b) => b.id === 'null-verloren')?.match).toBe(24);
    expect(mal.bugs?.find((b) => b.id === 'null-zu-viel')?.match).toBe(2400);
    const geteilt = find(2, '240 : 6 = □');
    expect(geteilt.bugs?.find((b) => b.id === 'teilen-null')?.match).toBe(4);
    expect(geteilt.bugs?.find((b) => b.id === 'teilen-null')?.hint).toBe('6 · 4 sind 24. Für 240 brauchst du 24 Zehner.');
    expect(find(3, '360 : 60 = □').answer).toMatchObject({ value: 6 });
    expect(find(3, '□ · 30 = 210').answer).toMatchObject({ value: 7 });
  });
});
