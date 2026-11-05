import { BOX } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { bugList, multiBugs, targetAb } from '../shared';
import { MINUS_OP, PLUS_OP, calc, finish, flip, rechenstrich, spoken, spokenFields, strichSteps, term, zehnerStrahl, type Op, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.plus-minus', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.kopfrechnen'];

const RECHENZEICHEN = 'Schau noch einmal auf das Rechenzeichen.';

interface Aufgabe {
  n: number;
  op: Op;
  m: number;
  r: number;
}

export const aufgabe = (n: number, op: Op, m: number): Aufgabe => ({ n, op, m, r: calc(n, op, m) });
const digit = (n: number, place: number) => Math.floor(n / place) % 10;
const sind = (n: number) => (n === 1 ? 'ist' : 'sind');
/** '7 sind Einer. Der Zehner bleibt gleich.' Only for a task without crossing: 788 + 5 changes the Zehner. */
const einerBleibt = (e: number) => `${e} ${e === 1 ? 'ist ein Einer' : 'sind Einer'}. Der Zehner bleibt gleich.`;

// ─── Stufe 1: one place changes, no crossing ──────────────────────────────────

function ohneUebergang(rng: Rng, n: number, place: number): Aufgabe {
  const d = digit(n, place);
  const op: Op = d >= 8 ? MINUS_OP : d <= 1 ? PLUS_OP : rng.pick([PLUS_OP, MINUS_OP]);
  const size = op === '+' ? rng.int(1, 9 - d) : rng.int(1, d);
  return aufgabe(n, op, size * place);
}

const hzNull = (rng: Rng) => rng.int(1, 9) * 100 + rng.int(1, 9) * 10;
const hze = (rng: Rng) => rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);

/** The first digit of m stands at the wrong place: 340 + 5 gives 390. */
function stelleBugs({ n, op, m }: Aufgabe): [string, number | null, string][] {
  const out: [string, number | null, string][] = [];
  if (m < 10) out.push(['stelle-verwechselt', calc(n, op, m * 10), einerBleibt(m)]);
  if (m >= 10 && m < 100) {
    out.push(['stelle-verwechselt', calc(n, op, m / 10), `${m / 10} Zehner ${sind(m / 10)} ${m}. Die Einer bleiben gleich.`]);
    out.push(['stelle-verwechselt', calc(n, op, m * 10), `${m / 10} Zehner ${sind(m / 10)} ${m}. Der Hunderter bleibt gleich.`]);
  }
  if (m >= 100) out.push(['stelle-verwechselt', calc(n, op, m / 10), `${m / 100} Hunderter ${sind(m / 100)} ${m}. Der Zehner bleibt gleich.`]);
  return out;
}

function nameOf(m: number): string {
  return m < 10 ? 'Einer' : m < 100 ? 'Zehner' : 'Hunderter';
}

/** How many of its place m counts: 50 is 5 Zehner. */
const stellenZahl = (m: number) => (m < 10 ? m : m < 100 ? m / 10 : m / 100);

export function einStelle(a: Aufgabe, withLine: boolean): Task {
  const { n, op, m, r } = a;
  const expression = `${term(n, op, m)} = ${BOX}`;
  const count = stellenZahl(m);
  return {
    key: `stelle:${n}:${op}:${m}`,
    prompt: 'Rechne im Kopf.',
    expression,
    ...(withLine ? { visual: zehnerStrahl(n, r) } : {}),
    answer: { kind: 'number', value: r, label: 'Ergebnis' },
    hints: [`Welche Stelle ändert sich? Schau auf die ${m}.`, `Die ${nameOf(m)} ändern sich um ${count}. Die anderen Stellen bleiben gleich.`],
    steps: [m < 10 ? `Die ${m} zählt Einer.` : `${m} ${sind(count)} ${count} ${nameOf(m)}.`, { text: `Also: ${term(n, op, m)} = ${r}.`, visual: rechenstrich([n, r]) }],
    bugs: bugList(r, [...stelleBugs(a), ['rechenzeichen', op === '+' ? (n >= m ? n - m : null) : n + m, RECHENZEICHEN]]),
    praise: `Du hast nur die ${nameOf(m)} geändert.`,
    srText: spoken('Rechne im Kopf.', expression),
  };
}

// ─── Gaps, on every Stufe ─────────────────────────────────────────────────────

/** The way between two numbers with a stop at the first and the last full hundred on it: 657, 700, 900, 920. */
function wegUeberHunderter(from: number, to: number): number[] {
  const up = to > from;
  const first = up ? (Math.floor(from / 100) + 1) * 100 : (Math.ceil(from / 100) - 1) * 100;
  const last = up ? (Math.ceil(to / 100) - 1) * 100 : (Math.floor(to / 100) + 1) * 100;
  const between = (x: number) => (up ? x > from && x < to : x < from && x > to);
  return [from, ...new Set([first, last].filter(between)), to];
}

/** One line for each jump of a way. */
const wegZeilen = (points: readonly number[], op: Op) =>
  points.slice(1).map((to, i) => `${i === 0 ? 'Zuerst' : 'Dann'} bis ${to}: ${term(points[i], op, Math.abs(to - points[i]))} = ${to}.`);

/** The worked way of a gap: backwards with the Umkehraufgabe, or in jumps from n to r. Without a full hundred on the way only one place changes. */
function lueckeSteps({ n, op, m, r }: Aufgabe, left: boolean): Step[] {
  const also = `Also: ${term(n, op, m)} = ${r}.`;
  const back = flip(op);
  const way = left ? wegUeberHunderter(r, n) : wegUeberHunderter(n, r);
  if (way.length === 2) {
    if (left) return [`Umkehraufgabe: ${term(r, back, m)} = ${n}.`, also];
    const count = stellenZahl(m);
    return [{ text: `Von ${n} bis ${r} ändern sich nur die ${nameOf(m)}.`, visual: rechenstrich([n, r]) }, `${count} ${nameOf(m)} ${sind(count)} ${m}.`, also];
  }
  if (left) return [`Umkehraufgabe: ${term(r, back, m)} = ${BOX}.`, ...strichSteps(way, wegZeilen(way, back)), also];
  const sizes = way.slice(1).map((to, i) => Math.abs(to - way[i]));
  return [...strichSteps(way, wegZeilen(way, op)), `Zusammen: ${sizes.join(' + ')} = ${m}.`, also];
}

export function luecke(a: Aufgabe, left: boolean, hilfe: string): Task {
  const { n, op, m, r } = a;
  const expression = left ? `${BOX} ${op} ${m} = ${r}` : `${n} ${op} ${BOX} = ${r}`;
  const value = left ? n : m;
  const back = flip(op);
  const inSchritten = wegUeberHunderter(n, r).length > 2;
  return {
    key: `luecke:${n}:${op}:${m}:${left ? 'l' : 'r'}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [left ? `Rechne rückwärts: ${term(r, back, m)}.` : `Geh ${inSchritten ? 'in Schritten ' : ''}von ${n} bis ${r}.`, hilfe],
    steps: lueckeSteps(a, left),
    bugs: bugList(value, [
      ['umkehr-richtung', left ? calc(r, op, m) : null, `Rechne rückwärts: ${term(r, back, m)}.`],
      ['summe-gerechnet', left ? null : n + r, `Du suchst den Weg von ${n} bis ${r}.`],
      ['stelle-verwechselt', !left && m >= 10 && m % 10 === 0 ? m / 10 : null, 'Schau auf die Stelle: Es fehlen Zehner, nicht Einer.'],
      ['minus-spalten', !left && op !== '+' && digit(n, 10) < digit(r, 10) ? Math.abs(digit(n, 10) - digit(r, 10)) * 10 : null, `${digit(n, 10)} − ${digit(r, 10)} geht nicht. Rechne erst bis zum Hunderter, dann weiter.`],
    ]),
    praise: left ? 'Du hast mit der Umkehraufgabe rückwärts gerechnet.' : 'Du hast den Weg zwischen den Zahlen gefunden.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Stufe 2: crossing a hundred ──────────────────────────────────────────────

function uebergang(rng: Rng, ones: number): Aufgabe {
  const op = rng.pick([PLUS_OP, MINUS_OP]);
  if (op === '+') {
    const za = rng.int(3, 9);
    const zb = rng.int(11 - za, 9);
    return aufgabe(rng.int(1, 8) * 100 + za * 10 + ones, op, zb * 10);
  }
  const za = rng.int(1, 7);
  const zb = rng.int(za + 1, 9);
  return aufgabe(rng.int(1, 9) * 100 + za * 10 + ones, op, zb * 10);
}

function uebergangBugs({ n, op, m, r }: Aufgabe) {
  const h = Math.floor(n / 100);
  const za = digit(n, 10);
  const zb = m / 10;
  const e = n % 10;
  const hundert = op === '+' ? (h + 1) * 100 : h * 100;
  return bugList(r, [
    ['hunderter-uebergang', op === '+' ? h * 100 + ((za + zb) % 10) * 10 + e : null, `${za} Zehner und ${zb} Zehner sind ${za + zb} Zehner. Das ist 1 Hunderter mehr.`],
    ['hunderter-uebergang', op === '+' ? Number(`${h}${za + zb}${e}`) : null, `${za} Zehner und ${zb} Zehner sind ${za + zb} Zehner. Das ist 1 Hunderter mehr.`],
    ['minus-spalten', op !== '+' ? h * 100 + Math.abs(za - zb) * 10 + e : null, `${za} − ${zb} geht nicht. Rechne erst bis ${hundert}, dann weiter.`],
    ['rechenzeichen', op === '+' ? (n >= m ? n - m : null) : n + m, RECHENZEICHEN],
  ]);
}

export function uebergangTask(a: Aufgabe): Task {
  const { n, op, m, r } = a;
  const expression = `${term(n, op, m)} = ${BOX}`;
  const h = op === '+' ? (Math.floor(n / 100) + 1) * 100 : Math.floor(n / 100) * 100;
  const first = Math.abs(h - n);
  const rest = m - first;
  return {
    key: `ueber:${n}:${op}:${m}`,
    prompt: 'Rechne über den Hunderter.',
    expression,
    visual: zehnerStrahl(n, r),
    answer: { kind: 'number', value: r, label: 'Ergebnis' },
    hints: [`Rechne erst bis ${h}, dann weiter.`, `Bis ${h} sind es ${first}. Rechne von dort weiter.`],
    steps: [...strichSteps([n, h, r], [`Zuerst bis ${h}: ${term(n, op, first)} = ${h}.`, `Dann noch ${rest}: ${term(h, op, rest)} = ${r}.`]), `Also: ${term(n, op, m)} = ${r}.`],
    bugs: uebergangBugs(a),
    praise: `Du hast den Halt bei ${h} genutzt.`,
    srText: spoken('Rechne über den Hunderter.', expression),
  };
}

// ─── Stufe 3: HZE ± ZE and HZE ± HZE in steps ─────────────────────────────────

function zweiStellen(rng: Rng): Aufgabe {
  const op = rng.pick([PLUS_OP, MINUS_OP]);
  const ones = rng.int(1, 8);
  const mOnes = op === '+' ? rng.int(10 - ones, 9) : rng.int(ones + 1, 9);
  const m = rng.int(1, 9) * 10 + mOnes;
  const n = rng.int(op === '+' ? 1 : 2, 8) * 100 + rng.int(1, 9) * 10 + ones;
  return aufgabe(n, op, m);
}

function zweiStellenBugs({ n, op, m, r }: Aufgabe) {
  const e = n % 10;
  const eb = m % 10;
  const za = digit(n, 10);
  const zb = digit(m, 10);
  const h = Math.floor(n / 100);
  return bugList(r, [
    ['minus-spalten', op !== '+' ? h * 100 + Math.abs(za - zb) * 10 + Math.abs(e - eb) : null, `${e} − ${eb} geht nicht. Rechne erst bis ${n - e}, dann weiter.`],
    ['zehner-uebergang', op === '+' ? h * 100 + za * 10 + zb * 10 + ((e + eb) % 10) : null, `${e} + ${eb} sind ${e + eb}. 1 Zehner kommt dazu.`],
    ['rechenzeichen', op === '+' ? (n >= m ? n - m : null) : n + m, RECHENZEICHEN],
  ]);
}

export function zweiStellenTask(a: Aufgabe): Task {
  const { n, op, m, r } = a;
  const expression = `${term(n, op, m)} = ${BOX}`;
  const z = m - (m % 10);
  const e = m % 10;
  const mid = calc(n, op, z);
  return {
    key: `zwei:${n}:${op}:${m}`,
    prompt: 'Rechne in Schritten.',
    expression,
    answer: { kind: 'number', value: r, label: 'Ergebnis' },
    hints: [`Zerlege die ${m}: erst ${z}, dann ${e}.`, `Rechne zuerst ${term(n, op, z)}.`],
    steps: [...strichSteps([n, mid, r], [`${term(n, op, z)} = ${mid}`, `${term(mid, op, e)} = ${r}`]), `Also: ${term(n, op, m)} = ${r}.`],
    bugs: zweiStellenBugs(a),
    praise: `Du hast die ${m} in Zehner und Einer zerlegt.`,
    srText: spoken('Rechne in Schritten.', expression),
  };
}

function dreiStellen(rng: Rng): Aufgabe {
  const op = rng.pick([PLUS_OP, MINUS_OP]);
  for (;;) {
    const n = op === '+' ? rng.int(120, 780) : rng.int(320, 980);
    const m = rng.int(1, op === '+' ? 2 : Math.max(1, Math.floor(n / 100) - 1)) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);
    const r = calc(n, op, m);
    if (op === '+' && r > 999) continue;
    const carry = op === '+' ? digit(n, 1) + digit(m, 1) >= 10 || digit(n, 10) + digit(m, 10) >= 10 : digit(n, 1) < digit(m, 1) || digit(n, 10) < digit(m, 10);
    // The hints name the parts of m, so no way point may equal a part: 470 − 274 lands on 200.
    const parts = [m - (m % 100), (m % 100) - (m % 10)];
    const s1 = calc(n, op, parts[0]);
    const clash = [s1, calc(s1, op, parts[1]), r].some((x) => parts.includes(x));
    if (carry && r > 0 && !clash) return aufgabe(n, op, m);
  }
}

function dreiStellenTeile({ m }: Aufgabe) {
  const h = m - (m % 100);
  const z = (m % 100) - (m % 10);
  return { h, z, e: m % 10 };
}

function dreiStellenFelder(a: Aufgabe): Task {
  const { n, op, m, r } = a;
  const { h, z, e } = dreiStellenTeile(a);
  const s1 = calc(n, op, h);
  const s2 = calc(s1, op, z);
  // Words between the steps, no '=': 458 + 200 is not 658 + 80, so the steps never make one chain.
  const weiter = op === '+' ? 'dazu' : 'weg';
  const fields = [
    { id: 's1', value: s1, before: `${term(n, op, h)} =`, label: 'Erster Schritt: Hunderter' },
    { id: 's2', value: s2, before: `dann ${z} ${weiter}:`, label: 'Zweiter Schritt: Zehner' },
    { id: 's3', value: r, before: `dann ${e} ${weiter}:`, label: 'Dritter Schritt: Einer' },
  ];
  const crossesTens = digit(s1, 100) !== digit(s2, 100);
  const crossesOnes = digit(s2, 10) !== digit(r, 10);
  const bugs: (Bug | false)[] = [
    crossesTens && (op === '+' ? { id: 'hunderter-uebergang', match: { s2: s2 - 100 }, hint: `${digit(s1, 10)} Zehner und ${z / 10} Zehner: Das ist 1 Hunderter mehr.` } : { id: 'minus-spalten', match: { s2: s2 + 100 }, hint: 'Die Zehner reichen nicht. Rechne erst bis zum Hunderter, dann weiter.' }),
    crossesOnes && (op === '+' ? { id: 'zehner-uebergang', match: { s3: r - 10 }, hint: `${digit(s2, 1)} + ${e} sind mehr als 9. 1 Zehner kommt dazu.` } : { id: 'minus-spalten', match: { s3: r + 10 }, hint: 'Die Einer reichen nicht. Rechne erst bis zum Zehner, dann weiter.' }),
    // This last step often crosses a ten, so the hint says nothing about the Zehner.
    { id: 'stelle-verwechselt', match: { s3: calc(s2, op, e * 10) }, hint: `${e === 1 ? '1 ist ein Einer, kein Zehner' : `${e} sind Einer, keine Zehner`}. Nimm nur ${e} ${weiter}.` },
  ];
  const prompt = `Rechne ${term(n, op, m)} in Schritten.`;
  return {
    key: `felder:${n}:${op}:${m}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Zerlege die ${m} in ${h}, ${z} und ${e}.`, 'Rechne mit jedem Ergebnis weiter.'],
    steps: [`Zerlege die ${m}: ${h}, ${z} und ${e}.`, ...strichSteps([n, s1, s2, r], [`${term(n, op, h)} = ${s1}`, `${term(s1, op, z)} = ${s2}`, `${term(s2, op, e)} = ${r}; Ergebnisse: ${s1}, ${s2}, ${r}.`])],
    bugs: multiBugs(bugs, fields),
    praise: 'Du hast Hunderter, Zehner und Einer nacheinander gerechnet.',
    srText: spoken(prompt, spokenFields(fields)),
  };
}

function dreiStellenDirekt(a: Aufgabe): Task {
  const { n, op, m, r } = a;
  const { h, z, e } = dreiStellenTeile(a);
  const s1 = calc(n, op, h);
  const s2 = calc(s1, op, z);
  const expression = `${term(n, op, m)} = ${BOX}`;
  const hundreds = Math.floor(n / 100);
  const hm = Math.floor(m / 100);
  // Every column on its own: no carry at all, or the smaller digit taken from the larger.
  const noCarry = op === '+' ? (hundreds + hm) * 100 + ((digit(n, 10) + digit(m, 10)) % 10) * 10 + ((n % 10) + e) % 10 : null;
  const spalten = op !== '+' ? (hundreds - hm) * 100 + Math.abs(digit(n, 10) - digit(m, 10)) * 10 + Math.abs((n % 10) - e) : null;
  return {
    key: `direkt:${n}:${op}:${m}`,
    prompt: 'Rechne in Schritten im Kopf.',
    expression,
    answer: { kind: 'number', value: r, label: 'Ergebnis' },
    hints: [`Zerlege die ${m} in ${h}, ${z} und ${e}.`, `Rechne zuerst ${term(n, op, h)}.`],
    steps: [...strichSteps([n, s1, s2, r], [`${term(n, op, h)} = ${s1}`, `${term(s1, op, z)} = ${s2}`, `${term(s2, op, e)} = ${r}`]), `Also: ${term(n, op, m)} = ${r}.`],
    bugs: bugList(r, [
      [digit(n, 10) + digit(m, 10) >= 10 ? 'hunderter-uebergang' : 'zehner-uebergang', noCarry, 'Über 9 kommt 1 zur nächsten Stelle dazu. Rechne in Schritten.'],
      ['minus-spalten', spalten, 'Eine Stelle reicht nicht. Rechne erst bis zum Hunderter oder Zehner.'],
      ['rechenzeichen', op === '+' ? (n >= m ? n - m : null) : n + m, RECHENZEICHEN],
    ]),
    praise: `Du hast die ${m} in Schritten ${op === '+' ? 'dazugerechnet' : 'abgezogen'}.`,
    srText: spoken('Rechne in Schritten im Kopf.', expression),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => einStelle(ohneUebergang(rng, hzNull(rng), 10), true), (rng) => einStelle(ohneUebergang(rng, hze(rng), 100), false)],
    2: [(rng) => einStelle(ohneUebergang(rng, hze(rng), 10), true), (rng) => einStelle(ohneUebergang(rng, hzNull(rng), 1), true)],
    3: [(rng) => luecke(ohneUebergang(rng, hzNull(rng), 10), rng.chance(0.5), 'Nur eine Stelle ändert sich.')],
  },
  2: {
    1: [(rng) => uebergangTask(uebergang(rng, 0))],
    2: [(rng) => uebergangTask(uebergang(rng, rng.int(1, 9)))],
    3: [(rng) => luecke(uebergang(rng, 0), rng.chance(0.5), 'Halte beim Hunderter an.')],
  },
  3: {
    1: [(rng) => zweiStellenTask(zweiStellen(rng))],
    2: [(rng) => dreiStellenFelder(dreiStellen(rng))],
    3: [(rng) => dreiStellenDirekt(dreiStellen(rng)), (rng) => luecke(dreiStellen(rng), rng.chance(0.5), 'Halte bei einer vollen Zahl an.')],
  },
};

export const plusMinusSkill: SkillDef = {
  ...SKILL,
  title: 'Plus und Minus bis 1000',
  description: 'Du rechnest in Schritten am Rechenstrich.',
  stufen: {
    1: 'Hunderter, Zehner oder Einer dazu und weg, ohne Übergang',
    2: 'Über den Hunderter: 380 + 50 und 420 − 70',
    3: 'In Schritten: 367 + 248, auch mit Lücke',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
