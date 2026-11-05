import { BOX } from '../../core/format';
import type { Ab, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { bugList, targetAb } from '../shared';
import { durch, finish, mal, spoken, stellenTafel, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.zehnerzahlen', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.zehnereinmaleins'];
const KMK_STELLE = ['ZO.zehnereinmaleins', 'ZO.stellenwert'];

const RICHTUNG_KLEINER = 'Bei geteilt wird die Zahl kleiner.';
const RICHTUNG_GROESSER = 'Bei mal wird die Zahl größer.';

const unitName = (f: 10 | 100) => (f === 10 ? 'Zehner' : 'Hunderter');

// ─── Stufe 1: · 10, · 100, : 10, : 100 ────────────────────────────────────────

/** n · f = □, f on either side. */
function malStufe(n: number, f: 10 | 100, swap: boolean): Task {
  const v = n * f;
  const shown = swap ? mal(f, n) : mal(n, f);
  const expression = `${shown} = ${BOX}`;
  const einer = `Aus ${n} Einern werden ${n} ${unitName(f)}.`;
  const steps: Step[] = [einer, { text: `Also: ${shown} = ${v}.`, visual: stellenTafel([n, v]) }];
  return {
    key: `mal:${n}:${f}:${swap ? 'g' : 'k'}`,
    kmk: KMK_STELLE,
    prompt: 'Rechne im Kopf.',
    expression,
    visual: stellenTafel([n]),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Mal ${f}: Aus Einern werden ${unitName(f)}.`, einer],
    steps,
    bugs: bugList(v, [
      ['null-verloren', f === 100 ? n * 10 : n, `${einer} Schau auf die Nullen.`],
      ['null-zu-viel', v * 10, `${f} hat ${f === 10 ? 'nur eine Null' : '2 Nullen'}. ${einer}`],
      ['falsche-richtung', n % f === 0 ? n / f : null, RICHTUNG_GROESSER],
    ]),
    praise: `Du hast aus Einern ${unitName(f)} gemacht.`,
    srText: spoken('Rechne im Kopf.', expression),
  };
}

/** p : f = □ */
function durchStufe(p: number, f: 10 | 100): Task {
  const v = p / f;
  const expression = `${durch(p, f)} = ${BOX}`;
  return {
    key: `durch:${p}:${f}`,
    kmk: KMK_STELLE,
    prompt: 'Rechne im Kopf.',
    expression,
    visual: stellenTafel([p]),
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Geteilt durch ${f}: Wie viele ${unitName(f)} stecken in ${p}?`, `Bei ${durch(p, f)} ${f === 10 ? 'fällt eine Null' : 'fallen 2 Nullen'} weg.`],
    steps: [`In ${p} stecken ${v} ${unitName(f)}.`, { text: `Also: ${durch(p, f)} = ${v}.`, visual: stellenTafel([p, v]) }],
    bugs: bugList(v, [
      ['null-verloren', v % 10 === 0 ? v / 10 : null, '10 hat nur eine Null. Es fällt nur eine Null weg.'],
      ['null-zu-viel', v * 10, f === 10 ? 'Geteilt durch 10: Eine Null fällt weg.' : '100 hat 2 Nullen. So viele fallen weg.'],
      ['falsche-richtung', p * f, RICHTUNG_KLEINER],
    ]),
    praise: `Du hast die ${unitName(f)} in ${p} gefunden.`,
    srText: spoken('Rechne im Kopf.', expression),
  };
}

type StufeForm = 'zahl-mal' | 'faktor' | 'teiler' | 'zahl-durch';

/** □ · 10 = 370, 7 · □ = 700, 800 : □ = 80, □ : 10 = 37 */
function stufeLuecke(form: StufeForm, n: number, f: 10 | 100): Task {
  const p = n * f;
  const expression = form === 'zahl-mal' ? `${BOX} · ${f} = ${p}` : form === 'faktor' ? `${n} · ${BOX} = ${p}` : form === 'teiler' ? `${p} : ${BOX} = ${n}` : `${BOX} : ${f} = ${n}`;
  const value = form === 'zahl-mal' ? n : form === 'zahl-durch' ? p : f;
  const lastLine = form === 'zahl-mal' || form === 'faktor' ? `Also: ${mal(n, f)} = ${p}.` : `Also: ${durch(p, f)} = ${n}.`;
  return {
    key: `luecke:${form}:${n}:${f}`,
    kmk: KMK_STELLE,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: form === 'faktor' || form === 'teiler' ? ['Vergleiche die beiden Zahlen. Wie viele Nullen kommen dazu oder fallen weg?', 'Jede Null gehört zur fehlenden Zahl.'] : ['Rechne rückwärts mit der Umkehraufgabe.', form === 'zahl-mal' ? `Rechne ${durch(p, f)}.` : `Rechne ${mal(n, f)}.`],
    steps: [form === 'faktor' || form === 'teiler' ? `Von ${n} bis ${p} ${f === 10 ? 'kommt eine Null' : 'kommen 2 Nullen'} dazu.` : `Umkehraufgabe: ${form === 'zahl-mal' ? `${durch(p, f)} = ${n}` : `${mal(n, f)} = ${p}`}.`, lastLine, `In die Lücke gehört ${value}.`],
    bugs: bugList(value, [
      ['null-verloren', value % 10 === 0 ? value / 10 : null, 'Schau auf die Nullen: Es fehlt noch eine Null.'],
      ['null-zu-viel', value * 10, 'Schau auf die Nullen: Das ist eine Null zu viel.'],
      ['falsche-richtung', form === 'zahl-mal' ? p * f : form === 'zahl-durch' ? n : null, form === 'zahl-mal' ? `Das Ergebnis ist ${p}. Die gesuchte Zahl ist kleiner.` : `Das Ergebnis ist ${n}. Die gesuchte Zahl ist größer.`],
    ]),
    praise: 'Du hast mit den Nullen rückwärts gedacht.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Stufe 2 and 3: 6 · 40, 240 : 6, 360 : 60 ─────────────────────────────────

/** a · z, a one digit, z a Zehnerzahl or Hunderterzahl. */
function zehnerMal(a: number, z: number, swap: boolean): Task {
  const v = a * z;
  const scale = z >= 100 ? 100 : 10;
  const small = z / scale;
  const shown = swap ? mal(z, a) : mal(a, z);
  const expression = `${shown} = ${BOX}`;
  const unit = scale === 100 ? 'Hunderter' : 'Zehner';
  const kleine = mal(a, small);
  return {
    key: `z-mal:${a}:${z}:${swap ? 'g' : 'k'}`,
    prompt: 'Nutze die kleine Malaufgabe.',
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Rechne zuerst ${kleine}.`, `Bei ${z} sind es ${unit}: Das Ergebnis zählt ${unit}.`],
    steps: [`${kleine} = ${a * small}`, `Das sind ${a * small} ${unit}.`, { text: `Also: ${shown} = ${v}.`, visual: stellenTafel([a * small, v]) }],
    bugs: bugList(v, [
      ['null-verloren', a * small, `${kleine} sind ${a * small}. Bei ${z} sind es ${unit}: ${a * small} ${unit}.`],
      ['null-verloren', scale === 100 ? a * small * 10 : null, `Bei ${z} sind es ${unit}: ${a * small} ${unit}.`],
      ['null-zu-viel', v * 10, `Nur die ${z} hat ${scale === 100 ? '2 Nullen' : 'eine Null'}. Schau auf die Nullen in der Aufgabe.`],
      ['mal-als-plus', a + z, `${shown} heißt ${a}-mal die ${z}.`],
    ]),
    praise: `Du hast ${kleine} genutzt und an die ${unit} gedacht.`,
    srText: spoken('Nutze die kleine Malaufgabe.', expression),
  };
}

/** p : a = z (240 : 6 = 40). */
function zehnerDurch(a: number, z: number): Task {
  const p = a * z;
  const scale = z >= 100 ? 100 : 10;
  const small = z / scale;
  const unit = scale === 100 ? 'Hunderter' : 'Zehner';
  const expression = `${durch(p, a)} = ${BOX}`;
  return {
    key: `z-durch:${p}:${a}`,
    prompt: 'Nutze die kleine Geteiltaufgabe.',
    expression,
    answer: { kind: 'number', value: z, label: 'Ergebnis' },
    hints: [`${p} sind ${a * small} ${unit}. Rechne ${durch(a * small, a)}.`, `Das Ergebnis zählt ${unit}.`],
    steps: [`${p} sind ${a * small} ${unit}.`, `${durch(a * small, a)} = ${small}`, { text: `Also: ${durch(p, a)} = ${z}.`, visual: stellenTafel([p, z]) }],
    bugs: bugList(z, [
      ['teilen-null', small, `${mal(a, small)} sind ${a * small}. Für ${p} brauchst du ${a * small} ${unit}.`],
      ['null-zu-viel', z * 10, `${mal(a, z * 10)} ist viel mehr als ${p}. Schau auf die Nullen.`],
      ['minus-gerechnet', p - a, 'Das ist minus. Geteilt heißt: Wie oft passt die Zahl?'],
    ]),
    praise: `Du hast in ${p} die ${unit} gesehen.`,
    srText: spoken('Nutze die kleine Geteiltaufgabe.', expression),
  };
}

/** p : z = a (360 : 60 = 6): both numbers lose one Null, and 400 : 50 still has one left. */
function durchZehnerzahl(a: number, z: number): Task {
  const p = a * z;
  const small = z / 10;
  const expression = `${durch(p, z)} = ${BOX}`;
  return {
    key: `durch-z:${p}:${z}`,
    prompt: 'Rechne im Kopf.',
    expression,
    answer: { kind: 'number', value: a, label: 'Ergebnis' },
    hints: [`Bei ${p} und ${z} fällt je eine Null weg.`, `Rechne ${durch(p / 10, small)}.`],
    steps: [`Bei beiden Zahlen fällt eine Null weg: ${durch(p / 10, small)}.`, `${mal(a, small)} = ${p / 10}`, `Also: ${durch(p, z)} = ${a}.`],
    bugs: bugList(a, [
      ['null-zu-viel', a * 10, `Bei ${p} und ${z} fällt je eine Null weg, nicht nur bei ${z}.`],
      ['minus-gerechnet', p - z, 'Das ist minus. Geteilt heißt: Wie oft passt die Zahl?'],
    ]),
    praise: 'Du hast bei beiden Zahlen eine Null gestrichen.',
    srText: spoken('Rechne im Kopf.', expression),
  };
}

type Form = 'zahl-mal' | 'faktor' | 'teiler' | 'zahl-durch';

/** □ · 30 = 210 (Ergebnis 7), 7 · □ = 210, 210 : □ = 30, □ : 30 = 7. */
function zehnerLuecke(form: Form, a: number, z: number): Task {
  const p = a * z;
  const small = z / 10;
  const expression = form === 'zahl-mal' ? `${BOX} · ${z} = ${p}` : form === 'faktor' ? `${a} · ${BOX} = ${p}` : form === 'teiler' ? `${p} : ${BOX} = ${z}` : `${BOX} : ${z} = ${a}`;
  const value = form === 'zahl-mal' || form === 'teiler' ? a : form === 'faktor' ? z : p;
  const firstHint = form === 'zahl-durch' ? 'Rechne rückwärts mit der Umkehraufgabe.' : 'Suche die kleine Malaufgabe.';
  const secondHint = form === 'zahl-durch' ? `Rechne ${mal(a, small)}. Das Ergebnis zählt Zehner.` : `${p} sind ${p / 10} Zehner. Welche Zahl mal ${form === 'faktor' ? a : small} passt?`;
  return {
    key: `z-luecke:${form}:${a}:${z}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [firstHint, secondHint],
    steps: [`Kleine Aufgabe: ${mal(a, small)} = ${p / 10}.`, { text: `${p / 10} Zehner sind ${p}.`, visual: stellenTafel([p / 10, p]) }, `Also: ${mal(a, z)} = ${p}. In die Lücke gehört ${value}.`],
    bugs: bugList(value, [
      ['teilen-null', form === 'faktor' ? small : null, `${mal(a, small)} sind ${p / 10}. Für ${p} brauchst du ${p / 10} Zehner.`],
      ['null-verloren', form === 'zahl-durch' ? p / 10 : null, `${p / 10} Zehner sind mehr als ${p / 10}. Schau auf die Nullen.`],
      ['null-zu-viel', value * 10, 'Schau auf die Nullen: Das ist eine Null zu viel.'],
    ]),
    praise: 'Du hast die kleine Malaufgabe in der großen gesehen.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const einer = (rng: Rng) => rng.int(2, 9);
const zehnerzahl = (rng: Rng) => rng.int(2, 9) * 10;
const zweistellig = (rng: Rng) => rng.int(11, 99);
/** A Hunderterzahl with a · z ≤ 1000. */
function hundertPaar(rng: Rng): [number, number] {
  const a = rng.int(2, 5);
  return [a, rng.int(1, Math.floor(10 / a)) * 100];
}

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => malStufe(einer(rng), rng.pick([10, 100] as const), rng.chance(0.3)), (rng) => durchStufe(einer(rng) * 10, 10), (rng) => durchStufe(einer(rng) * 100, 100)],
    2: [(rng) => malStufe(zweistellig(rng), 10, false), (rng) => durchStufe(zweistellig(rng) * 10, 10), (rng) => durchStufe(einer(rng) * 100, 10)],
    3: [(rng) => stufeLuecke('zahl-mal', zweistellig(rng), 10), (rng) => stufeLuecke('faktor', einer(rng), rng.pick([10, 100] as const)), (rng) => stufeLuecke('teiler', einer(rng) * 10, 10), (rng) => stufeLuecke('zahl-durch', einer(rng), rng.pick([10, 100] as const))],
  },
  2: {
    1: [(rng) => zehnerMal(einer(rng), zehnerzahl(rng), rng.chance(0.25))],
    2: [(rng) => zehnerDurch(einer(rng), zehnerzahl(rng)), (rng) => durchZehnerzahl(einer(rng), zehnerzahl(rng))],
    3: [(rng) => zehnerMal(...hundertPaar(rng), false), (rng) => zehnerDurch(...hundertPaar(rng))],
  },
  3: {
    1: [(rng) => durchZehnerzahl(einer(rng), zehnerzahl(rng)), (rng) => zehnerDurch(einer(rng), zehnerzahl(rng))],
    2: [(rng) => zehnerLuecke('zahl-mal', einer(rng), zehnerzahl(rng)), (rng) => zehnerLuecke('faktor', einer(rng), zehnerzahl(rng))],
    3: [(rng) => zehnerLuecke('teiler', einer(rng), zehnerzahl(rng)), (rng) => zehnerLuecke('zahl-durch', einer(rng), zehnerzahl(rng))],
  },
};

export const zehnerzahlenSkill: SkillDef = {
  ...SKILL,
  title: 'Mal und geteilt mit Zehnerzahlen',
  description: 'Du nutzt 6 · 4, um 6 · 40 zu rechnen.',
  stufen: {
    1: 'Mal 10 und mal 100: 7 · 100 und 800 : 10',
    2: 'Mit Zehnerzahlen: 6 · 40 und 240 : 6',
    3: 'Mit Lücke: □ · 30 = 210 und 360 : 60',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
