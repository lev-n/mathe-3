import { describe, expect, it } from 'vitest';
import type { SubtractionMethod } from '../../core/types';
import { digitAt, firstDiffPlace, layoutSub, placeName } from '../../core/written';
import { addCandidates, bugsFor, candidatesFor, mulCandidates, otherReadings, subCandidates, type BugCandidate } from './bugs';

const value = (list: BugCandidate[], id: string) => list.find((c) => c.id === id)?.value;
const hint = (list: BugCandidate[], id: string) => list.find((c) => c.id === id)?.hint;

describe('grammar of a Übertrag', () => {
  it('"1 Hunderter kommt", "Die 2 Hunderter kommen": never "Die 1 Hunderter"', () => {
    for (let a = 100; a < 900; a += 7) {
      for (const b of [a % 500, (a * 3) % 400]) {
        for (const c of [...addCandidates([a, b]), ...mulCandidates(a, 3)]) expect(c.hint, `${a} ${b}`).not.toMatch(/Die 1 (Einer|Zehner|Hunderter|Tausender)/);
      }
    }
  });
});

describe('plus: the wrong results of docs/research.md §5', () => {
  it.each([
    ['nicht-stellengerecht', [587, 34], 927],
    ['uebertrag-vergessen', [376, 145], 411],
    ['uebertrag-zur-null', [508, 406], 904],
    ['uebertrag-zu-viel', [481, 315], 896],
    ['leerstelle', [505, 495], 0],
    ['null-plus', [360, 49], 400],
  ])('%s: %j gives %i', (id, ops, wrong) => {
    expect(value(addCandidates(ops), id)).toBe(wrong);
  });

  it('a hint names the digits of this task', () => {
    expect(hint(addCandidates([376, 145]), 'uebertrag-vergessen')).toBe('6 + 5 sind 11. 1 Zehner kommt zur Zehnerspalte.');
    expect(hint(addCandidates([508, 406]), 'uebertrag-zur-null')).toBe('Auch zur 0 kommt der Übertrag: 0 + 0 + 1.');
    expect(hint(addCandidates([481, 315]), 'uebertrag-zu-viel')).toBe('Bei den Zehnern sind es nur 9. Dann gibt es keinen Übertrag.');
    expect(hint(addCandidates([505, 495]), 'leerstelle')).toBe('Schreib den letzten Übertrag vorne hin. Das ist der Tausender.');
    expect(hint(addCandidates([360, 49]), 'null-plus')).toBe('0 + 9 bleibt 9. Null dazu ändert nichts.');
    expect(hint(addCandidates([587, 34]), 'nicht-stellengerecht')).toBe('Einer unter Einer, Zehner unter Zehner. Schreib die 34 nach rechts.');
  });

  it('no misconception appears where the numbers cannot show it', () => {
    const list = addCandidates([123, 456]);
    expect(value(list, 'nicht-stellengerecht')).toBeNull();
    expect(value(list, 'uebertrag-vergessen')).toBeNull();
    expect(value(list, 'leerstelle')).toBeNull();
    expect(value(list, 'von-links')).toBeNull();
  });
});

describe('null-plus says what really happened', () => {
  it('a column with a Übertrag arriving is not this mistake', () => {
    for (const ops of [[309, 419], [396, 508], [109, 412], [501, 189]]) expect(value(addCandidates(ops), 'null-plus'), ops.join(' + ')).toBeNull();
  });

  it('the forgotten Übertrag keeps its own hint', () => {
    const bug = bugsFor('add', [109, 412], 'abziehen').find((b) => b.match === 511);
    expect(bug?.id).toBe('uebertrag-vergessen');
    expect(bug?.hint).toBe('9 + 2 sind 11. 1 Zehner kommt zur Zehnerspalte.');
  });

  it('the first column of 0 plus a digit without a Übertrag counts', () => {
    expect(value(addCandidates([109, 420]), 'null-plus')).toBe(520);
    expect(addCandidates([109, 420]).find((c) => c.id === 'null-plus')?.label).toBe('Bei 0 + 9 steht einfach 0.');
  });

  it('on every task, the label names the true digit and the result really shows a 0 there', () => {
    for (let a = 10; a <= 990; a += 7) {
      for (let b = 10; b <= 990; b += 11) {
        const c = addCandidates([a, b]).find((x) => x.id === 'null-plus');
        if (!c || c.value === null) continue;
        const [, digit] = /Bei 0 \+ (\d) steht einfach 0/.exec(c.label) as RegExpExecArray;
        const place = firstDiffPlace(a + b, c.value);
        expect(digitAt(c.value, place), `${a} + ${b}`).toBe(0);
        expect(digitAt(a + b, place), `${a} + ${b}`).toBe(Number(digit));
      }
    }
  });
});

describe('minus: the wrong results of docs/research.md §5', () => {
  const both: SubtractionMethod[] = ['abziehen', 'ergaenzen'];

  it.each([
    ['kleiner-von-groesser', 713, 281, 572],
    ['uebertrag-minus', 713, 281, 532],
    ['null-minus', 605, 213, 402],
    ['minus-null', 847, 205, 602],
    ['plus-statt-minus', 713, 281, 994],
    ['gleiche-ziffern', 753, 251, 402],
    ['stellenzahl', 756, 94, 762],
  ])('%s: %i − %i gives %i in both methods', (id, a, b, wrong) => {
    for (const method of both) expect(value(subCandidates(a, b, method), id), method).toBe(wrong);
  });

  it('over the 0 each method has its own way to go astray', () => {
    expect(value(subCandidates(403, 178, 'abziehen'), 'ueber-die-null')).toBe(335);
    expect(value(subCandidates(403, 178, 'ergaenzen'), 'ueber-die-null')).toBe(235);
    expect(value(subCandidates(1000, 233, 'abziehen'), 'ueber-die-null')).toBe(877);
    expect(value(subCandidates(1000, 233, 'ergaenzen'), 'ueber-die-null')).toBe(877);
  });

  it('the hints speak the words of the method', () => {
    expect(hint(subCandidates(713, 281, 'abziehen'), 'uebertrag-minus')).toBe('Du hast einen Hunderter gewechselt. Oben ist nun einer weniger.');
    expect(hint(subCandidates(713, 281, 'ergaenzen'), 'uebertrag-minus')).toBe('Du hast erweitert. Der Hunderter unten bekommt 1 dazu.');
    expect(hint(subCandidates(605, 213, 'abziehen'), 'null-minus')).toBe('0 − 1 geht nicht. Wechsle einen Hunderter.');
    expect(hint(subCandidates(847, 205, 'abziehen'), 'minus-null')).toBe('Nichts abziehen heißt: Die 4 bleibt.');
    expect(hint(subCandidates(753, 251, 'abziehen'), 'gleiche-ziffern')).toBe('5 − 5 sind 0. Hier wechselst du nichts.');
    expect(hint(subCandidates(403, 178, 'abziehen'), 'ueber-die-null')).toBe('Bei 0 Zehnern wechselst du zuerst einen Hunderter.');
    expect(hint(subCandidates(713, 281, 'abziehen'), 'kleiner-von-groesser')).toBe('Oben steht die 1, unten die 8. Rechne von oben nach unten.');
  });
});

describe('minus: a hint only asks for what the numbers allow', () => {
  it('null-minus changes the Hunderter over a 0, as the worked step does', () => {
    expect(hint(subCandidates(700, 125, 'abziehen'), 'null-minus')).toBe('0 − 5 geht nicht. Wechsle einen Hunderter über die 0.');
    expect(hint(subCandidates(500, 175, 'abziehen'), 'null-minus')).toBe('0 − 5 geht nicht. Wechsle einen Hunderter über die 0.');
    expect(hint(subCandidates(800, 716, 'abziehen'), 'null-minus')).toBe('0 − 6 geht nicht. Wechsle einen Hunderter über die 0.');
    expect(hint(subCandidates(1000, 233, 'abziehen'), 'null-minus')).toBe('0 − 3 geht nicht. Wechsle einen Tausender über die Nullen.');
  });

  it('Abziehen: no hint changes a place with 0 on top', () => {
    const places = ['Zehner', 'Hunderter', 'Tausender'];
    for (let a = 100; a <= 1000; a += 7) {
      for (let b = 1; b < a; b += 11) {
        for (const c of subCandidates(a, b, 'abziehen')) {
          if (c.value === null) continue;
          const named = /(?:wechsle|wechselst trotzdem|hast|zuerst) einen (Zehner|Hunderter|Tausender)/i.exec(c.hint);
          if (named) expect(digitAt(a, places.indexOf(named[1]) + 1), `${a} − ${b}, ${c.id}: ${c.hint}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('minus: Ergänzen has its own words (T12)', () => {
  it('minus-null names the Sprechweise of the column', () => {
    expect(hint(subCandidates(847, 205, 'ergaenzen'), 'minus-null')).toBe('Von 0 bis 4 fehlen 4.');
    expect(hint(subCandidates(760, 405, 'ergaenzen'), 'minus-null')).toBe('0 + 1 = 1. Von 1 bis 6 fehlen 5.');
    expect(hint(subCandidates(861, 201, 'ergaenzen'), 'minus-null')).toBe('Von 0 bis 6 fehlen 6.');
    expect(hint(subCandidates(817, 205, 'ergaenzen'), 'minus-null')).toBe('Von 0 bis 1 fehlt 1.');
  });

  it('the labels of minus-null and kleiner-von-groesser fit the method', () => {
    const label = (a: number, b: number, method: SubtractionMethod, id: string) => subCandidates(a, b, method).find((c) => c.id === id)?.label;
    expect(label(847, 205, 'abziehen', 'minus-null')).toBe('Bei 4 − 0 steht einfach 0.');
    expect(label(847, 205, 'ergaenzen', 'minus-null')).toBe('Bei der 0 unten steht einfach 0.');
    expect(label(713, 281, 'abziehen', 'kleiner-von-groesser')).toBe('Hier steht unten minus oben.');
    expect(label(713, 281, 'ergaenzen', 'kleiner-von-groesser')).toBe('Das Ergänzen geht hier von oben nach unten.');
  });

  it('the Sprechweise of a minus-null hint is the line of that column in the worked steps', () => {
    for (let a = 100; a <= 999; a += 7) {
      for (let b = 100; b < a; b += 11) {
        const c = subCandidates(a, b, 'ergaenzen').find((x) => x.id === 'minus-null');
        if (!c || c.value === null) continue;
        const place = firstDiffPlace(a - b, c.value);
        const col = layoutSub(a, b, 'ergaenzen').columns[place];
        const missing = /Von (\d+) bis (\d+) (?:fehlt|fehlen) (\d+)\./.exec(c.hint) as RegExpExecArray;
        expect([Number(missing[1]), Number(missing[3])], `${a} − ${b} ${placeName(place)}`).toEqual([(col.b ?? 0) + col.carryIn, col.r]);
      }
    }
  });
});

describe('mal', () => {
  it('234 · 3 without the Übertrag gives 692', () => {
    const list = mulCandidates(234, 3);
    expect(value(list, 'mal-uebertrag')).toBe(692);
    expect(hint(list, 'mal-uebertrag')).toBe('3 · 4 sind 12. 1 Zehner kommt zur nächsten Spalte.');
  });

  it('205 · 3 without the Übertrag to the 0 gives 605', () => {
    expect(value(mulCandidates(205, 3), 'uebertrag-zur-null')).toBe(605);
  });
});

describe('bugsFor', () => {
  it('leaves out the correct result and repeats', () => {
    const bugs = bugsFor('sub', [403, 178], 'abziehen');
    const matches = bugs.map((b) => b.match);
    expect(matches).not.toContain(225);
    expect(new Set(matches).size).toBe(matches.length);
    // 335 is the same result as "no column changes": the more specific bug wins
    expect(bugs.find((b) => b.match === 335)?.id).toBe('ueber-die-null');
  });
});

describe('a wrong option is no second true reading of the result on screen', () => {
  const others = (op: 'add' | 'sub', ops: number[], method: SubtractionMethod, id: string, shown: number) => {
    const planted = candidatesFor(op, ops, method).find((c) => c.id === id) as BugCandidate;
    return otherReadings(op, ops, method, planted, shown).map((c) => c.label);
  };

  it('a result above the top number still shows its mistake (belowTop leaves its value out)', () => {
    expect(value(subCandidates(329, 37, 'abziehen'), 'uebertrag-minus')).toBeNull();
    expect(others('sub', [329, 37], 'abziehen', 'stellenzahl', 392)).not.toContain('Nach dem Wechseln steht oben nicht 1 weniger.');
    expect(others('sub', [329, 37], 'ergaenzen', 'stellenzahl', 392)).not.toContain('Unten fehlt der Übertrag 1.');
    expect(others('sub', [239, 82], 'abziehen', 'kleiner-von-groesser', 257)).not.toContain('Nach dem Wechseln steht oben nicht 1 weniger.');
  });

  it('a column of 0 + 0 whose Übertrag got lost is what "Bei 0 + 1 steht einfach 0" says', () => {
    expect(others('add', [209, 404], 'abziehen', 'uebertrag-vergessen', 603)).not.toContain('Bei 0 + 1 steht einfach 0.');
    // The label stays a wrong option where no such column shows a 0.
    expect(others('add', [247, 318], 'abziehen', 'uebertrag-vergessen', 555)).toContain('Bei 0 + 1 steht einfach 0.');
  });

  it('two labels can name one mistake', () => {
    expect(others('add', [240, 671], 'abziehen', 'uebertrag-vergessen', 811)).not.toContain('Vorne fehlt der letzte Übertrag.');
    expect(others('sub', [451, 292], 'ergaenzen', 'uebertrag-minus', 269)).not.toContain('Vorne fehlt der Übertrag.');
    expect(others('sub', [451, 292], 'abziehen', 'uebertrag-minus', 269)).not.toContain('Vorne fehlt der Wechsel.');
    expect(others('add', [251, 95], 'abziehen', 'von-links', 247)).not.toContain('Der Übertrag fehlt.');
  });

  it('every value of the library fits its own label, on many tasks', () => {
    const own = (list: BugCandidate[], task: string) => {
      for (const c of list) if (c.value !== null) expect(c.fits(c.value), `${task}: ${c.id}`).toBe(true);
    };
    for (let a = 100; a <= 1000; a += 7) {
      for (let b = 10; b < a; b += 13) {
        own(subCandidates(a, b, 'abziehen'), `${a} − ${b}`);
        own(subCandidates(a, b, 'ergaenzen'), `${a} − ${b}`);
        if (a + b <= 1000) own(addCandidates([a, b]), `${a} + ${b}`);
      }
      for (let m = 2; m <= 9; m++) if (a * m <= 1000) own(mulCandidates(a, m), `${a} · ${m}`);
    }
  });
});
