import { BOX } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { bugList, multiBugs, targetAb } from '../shared';
import { durch, finish, gruppen, mal, spoken, spokenFields, type Task } from './helpers';

const SKILL = { id: 'kopfrechnen.in-schritten', topicId: 'kopfrechnen' } as const;
const KMK = ['ZO.halbschriftlich'];

/** Malkreuz of a worked step: 7 · 20 and 7 · 3. */
function malkreuz(a: number, parts: readonly number[]): Visual {
  return { type: 'table', header: ['·', ...parts.map(String)], rows: [[String(a), ...parts.map((x) => String(a * x))]] };
}

// ─── Stufe 1: 7 · 23 as 7 · 20 + 7 · 3 ────────────────────────────────────────

/** a and b for a task whose hints can name the parts: 8 · 45 is left out, because 8 · 5 is 40, the same as the part 40. */
function malPaar(rng: Rng, drawA: (rng: Rng) => number, drawB: (rng: Rng) => number): [number, number] {
  for (;;) {
    const a = drawA(rng);
    const b = drawB(rng);
    if (a * (b % 10) !== b - (b % 10)) return [a, b];
  }
}

function malZerlegt(a: number, b: number, withDots: boolean): Task {
  const z = b - (b % 10);
  const e = b % 10;
  const pz = a * z;
  const pe = a * e;
  const v = a * b;
  const fields = [
    { id: 'z', value: pz, before: `${mal(a, z)} =`, label: 'Zehner mal' },
    { id: 'e', value: pe, before: `${mal(a, e)} =`, label: 'Einer mal' },
    { id: 's', value: v, before: 'Zusammen:', label: 'Zusammen' },
  ];
  const bugs: Bug[] = multiBugs(
    [
      { id: 'zerlegen-einer', match: { e }, hint: `Nimm auch die ${e} mal: ${mal(a, z)} und ${mal(a, e)}.` },
      { id: 'zerlegen-einer', match: { s: pz + e }, hint: `Nimm auch die ${e} mal: ${mal(a, z)} und ${mal(a, e)}.` },
      { id: 'null-verloren', match: { z: a * (z / 10) }, hint: `Bei ${mal(a, z)} sind es Zehner. Rechne ${mal(a, z / 10)} Zehner.` },
      { id: 'teile-vergessen', match: { s: pz }, hint: 'Zusammen heißt: Rechne beide Ergebnisse plus.' },
    ],
    fields,
  );
  const prompt = `Rechne ${mal(a, b)} in Schritten.`;
  return {
    key: `mal:${a}:${b}`,
    prompt,
    ...(withDots ? { visual: gruppen(a, b) } : {}),
    answer: { kind: 'multi', fields },
    hints: [`Zerlege die ${b}: ${z} und ${e}.`, `Nimm beide Teile mal ${a}. Rechne die Ergebnisse dann plus.`],
    steps: [{ text: `Zerlege die ${b}: ${z} und ${e}.`, visual: malkreuz(a, [z, e]) }, `${mal(a, z)} = ${pz}`, `${mal(a, e)} = ${pe}`, `${pz} + ${pe} = ${v}`],
    bugs,
    praise: `Du hast die ${b} in Zehner und Einer zerlegt.`,
    srText: spoken(prompt, spokenFields(fields)),
  };
}

function malDirekt(a: number, b: number): Task {
  const z = b - (b % 10);
  const e = b % 10;
  const pz = a * z;
  const pe = a * e;
  const v = a * b;
  const expression = `${mal(a, b)} = ${BOX}`;
  return {
    key: `mal-direkt:${a}:${b}`,
    prompt: 'Rechne in Schritten im Kopf.',
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Zerlege die ${b}: ${z} und ${e}.`, `Rechne ${mal(a, z)} und ${mal(a, e)}.`],
    steps: [{ text: `Zerlege die ${b}: ${z} und ${e}.`, visual: malkreuz(a, [z, e]) }, `${mal(a, z)} = ${pz}; ${mal(a, e)} = ${pe}`, `Also: ${pz} + ${pe} = ${v}.`],
    bugs: bugList(v, [
      ['zerlegen-einer', pz + e, `Nimm auch die ${e} mal: ${mal(a, z)} und ${mal(a, e)}.`],
      ['teile-vergessen', pz, `Das ist erst ${mal(a, z)}. Es fehlt noch ${mal(a, e)}.`],
      ['null-verloren', a * (z / 10) + pe, `Bei ${mal(a, z)} sind es Zehner. Rechne ${mal(a, z / 10)} Zehner.`],
      ['mal-als-plus', a + b, `${mal(a, b)} heißt ${a}-mal die ${b}.`],
    ]),
    praise: `Du hast ${mal(a, z)} und ${mal(a, e)} verbunden.`,
    srText: spoken('Rechne in Schritten im Kopf.', expression),
  };
}

/** 7 · 23 = 7 · 20 + □ */
function malLuecke(a: number, b: number): Task {
  const z = b - (b % 10);
  const e = b % 10;
  const value = a * e;
  const expression = `${mal(a, b)} = ${mal(a, z)} + ${BOX}`;
  return {
    key: `mal-luecke:${a}:${b}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [`Die ${b} besteht aus ${z} und ${e}. Welcher Teil fehlt noch?`, `Rechne auch diesen Teil mal ${a}.`],
    steps: [`Die ${b} besteht aus ${z} und ${e}.`, `Es fehlt ${mal(a, e)}.`, `In die Lücke gehört ${value}.`],
    bugs: bugList(value, [
      ['zerlegen-einer', e, `Nimm auch die ${e} mal ${a}.`],
      ['teile-vergessen', a * b, 'Das ist das ganze Ergebnis. Gesucht ist nur der fehlende Teil.'],
    ]),
    praise: 'Du hast den fehlenden Teil der Zerlegung gefunden.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

// ─── Stufe 2: 96 : 4 as 80 : 4 + 16 : 4 ───────────────────────────────────────

/** q two digits, d · q below 100, split at the largest full tens of d. */
function teilenZahlen(rng: Rng): { p: number; d: number; q: number; t: number; r: number; qt: number; qr: number } {
  for (;;) {
    const d = rng.int(2, 8);
    const q = rng.int(11, Math.floor(99 / d));
    const qt = q - (q % 10);
    const qr = q % 10;
    const t = d * qt;
    const r = d * qr;
    // The hints name the parts t and r, so no result may equal a part: 72 : 6 is 12, and the part is 12 too.
    if (qr !== 0 && ![q, qt, qr].some((x) => x === t || x === r)) return { p: d * q, d, q, t, r, qt, qr };
  }
}

function teilenZerlegt(rng: Rng): Task {
  const { p, d, q, t, r, qt, qr } = teilenZahlen(rng);
  const fields = [
    { id: 't', value: qt, before: `${durch(t, d)} =`, label: 'Erster Teil' },
    { id: 'r', value: qr, before: `${durch(r, d)} =`, label: 'Zweiter Teil' },
    { id: 's', value: q, before: 'Zusammen:', label: 'Zusammen' },
  ];
  const prompt = `Rechne ${durch(p, d)} in Schritten.`;
  return {
    key: `teilen:${p}:${d}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Zerlege die ${p} in ${t} und ${r}.`, `Teile beide Teile durch ${d}. Rechne dann plus.`],
    // A picture of d groups of q fits while a group stays small.
    steps: [q <= 20 ? { text: `Zerlege die ${p}: ${t} und ${r}.`, visual: gruppen(d, q) } : `Zerlege die ${p}: ${t} und ${r}.`, `${durch(t, d)} = ${qt}`, `${durch(r, d)} = ${qr}`, `${qt} + ${qr} = ${q}`],
    bugs: multiBugs(
      [
        { id: 'zerlegen-einer', match: { r }, hint: `Teile auch die ${r}: ${durch(t, d)} und ${durch(r, d)}.` },
        { id: 'zerlegen-einer', match: { s: qt + r }, hint: `Teile auch die ${r}: ${durch(t, d)} und ${durch(r, d)}.` },
        { id: 'teile-vergessen', match: { s: qt }, hint: 'Zusammen heißt: Rechne beide Ergebnisse plus.' },
      ],
      fields,
    ),
    praise: `Du hast die ${p} passend zerlegt.`,
    srText: spoken(prompt, spokenFields(fields)),
  };
}

/** 96 : 4 = 80 : 4 + □ : 4 */
function teilenLuecke(rng: Rng): Task {
  const { p, d, t, r } = teilenZahlen(rng);
  const expression = `${durch(p, d)} = ${durch(t, d)} + ${BOX} : ${d}`;
  return {
    key: `teilen-luecke:${p}:${d}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: r, label: 'Zahl in der Lücke' },
    hints: [`${t} ist ein Teil der ${p}. Wie viel bleibt?`, `Rechne ${p} − ${t}.`],
    steps: [`${p} − ${t} = ${r}`, `Also: ${p} = ${t} + ${r}.`, `In die Lücke gehört ${r}.`],
    bugs: bugList(r, [
      ['zerlegen-einer', r / d, 'Gefragt ist die Zahl vor dem Zeichen, noch nicht das Ergebnis.'],
      ['teile-vergessen', t / d, `Das ist ${durch(t, d)}. Gefragt ist der zweite Teil der ${p}.`],
    ]),
    praise: `Du hast die ${p} richtig aufgeteilt.`,
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

function teilenDirekt(rng: Rng): Task {
  const { p, d, q, t, r, qt, qr } = teilenZahlen(rng);
  const expression = `${durch(p, d)} = ${BOX}`;
  return {
    key: `teilen-direkt:${p}:${d}`,
    prompt: 'Rechne in Schritten im Kopf.',
    expression,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Zerlege die ${p} in ${t} und ${r}.`, `Rechne ${durch(t, d)} und ${durch(r, d)}.`],
    steps: [`Zerlege die ${p}: ${t} und ${r}.`, `${durch(t, d)} = ${qt}; ${durch(r, d)} = ${qr}`, `Also: ${qt} + ${qr} = ${q}.`],
    bugs: bugList(q, [
      ['zerlegen-einer', qt + r, `Teile auch die ${r}: ${durch(t, d)} und ${durch(r, d)}.`],
      ['teile-vergessen', qt, `Das ist erst ${durch(t, d)}. Es fehlt noch ${durch(r, d)}.`],
      ['minus-gerechnet', p - d, 'Das ist minus. Geteilt heißt: Wie oft passt die Zahl?'],
    ]),
    praise: 'Du hast die Geteiltaufgabe in 2 leichte Aufgaben zerlegt.',
    srText: spoken('Rechne in Schritten im Kopf.', expression),
  };
}

// ─── Stufe 3: Nachbaraufgabe, three digits times one digit ────────────────────

/** 10 · 30 = 300, also 9 · 30 = □ */
function nachbar(k: number, a: number, z: number): Task {
  const kp = k * z;
  const v = a * z;
  const more = a > k;
  const sign = more ? '+' : '−';
  const expression = `${mal(k, z)} = ${kp}, also ${mal(a, z)} = ${BOX}`;
  return {
    key: `nachbar:${k}:${a}:${z}`,
    prompt: 'Nutze die Nachbaraufgabe.',
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${mal(a, z)} ist einmal die ${z} ${more ? 'mehr' : 'weniger'}.`, `Rechne ${kp} ${sign} ${z}.`],
    steps: [`Einmal die ${z} ${more ? 'mehr' : 'weniger'}: ${kp} ${sign} ${z} = ${v}.`, `Also: ${mal(a, z)} = ${v}.`],
    bugs: bugList(v, [
      ['nachbar-eins', more ? kp + 1 : kp - 1, `Es kommt nicht 1 ${more ? 'dazu' : 'weg'}, sondern eine ganze ${z}.`],
      ['nachbar-richtung', more ? kp - z : kp + z, `${mal(a, z)} hat ${more ? 'mehr' : 'weniger'} Reihen als ${mal(k, z)}.`],
    ]),
    praise: `Du hast die Nachbaraufgabe ${mal(k, z)} genutzt.`,
    srText: spoken('Nutze die Nachbaraufgabe.', expression),
  };
}

/** 9 · 30 = 10 · 30 − □ */
function nachbarLuecke(a: number, z: number): Task {
  const k = a + 1;
  const expression = `${mal(a, z)} = ${mal(k, z)} − ${BOX}`;
  return {
    key: `nachbar-luecke:${a}:${z}`,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression,
    answer: { kind: 'number', value: z, label: 'Zahl in der Lücke' },
    hints: [`Vergleiche ${mal(a, z)} und ${mal(k, z)}. Was ist der Unterschied?`, 'Es ist eine ganze Reihe weniger.'],
    steps: [`${mal(k, z)} ist einmal mehr als ${mal(a, z)}.`, `Einmal ${z} fällt weg.`, `In die Lücke gehört ${z}.`],
    bugs: bugList(z, [
      ['nachbar-eins', 1, 'Es fällt nicht nur 1 weg, sondern eine ganze Reihe.'],
      ['teile-vergessen', a * z, `Das ist schon das Ergebnis von ${mal(a, z)}. Gefragt ist der Unterschied.`],
    ]),
    praise: 'Du hast den Unterschied der beiden Aufgaben erkannt.',
    srText: spoken('Welche Zahl gehört in die Lücke?', expression),
  };
}

/** 3 · 214: hundreds, tens and ones, the product stays ≤ 1000. */
function dreistelligZahlen(rng: Rng): { a: number; n: number; h: number; z: number; e: number } {
  const a = rng.int(2, 4);
  const hMax = Math.floor(9 / a);
  const h = rng.int(1, Math.max(1, hMax)) * 100;
  const z = rng.int(1, 9) * 10;
  const e = rng.int(1, 9);
  return { a, n: h + z + e, h, z, e };
}

function dreistelligFelder(rng: Rng): Task {
  let t = dreistelligZahlen(rng);
  // The hints name the parts, so no result may equal a part.
  while (t.a * t.n > 1000 || [t.a * t.h, t.a * t.z, t.a * t.e].some((x) => x === t.h || x === t.z)) t = dreistelligZahlen(rng);
  const { a, n, h, z, e } = t;
  const fields = [
    { id: 'h', value: a * h, before: `${mal(a, h)} =`, label: 'Hunderter mal' },
    { id: 'z', value: a * z, before: `${mal(a, z)} =`, label: 'Zehner mal' },
    { id: 'e', value: a * e, before: `${mal(a, e)} =`, label: 'Einer mal' },
    { id: 's', value: a * n, before: 'Zusammen:', label: 'Zusammen' },
  ];
  const prompt = `Rechne ${mal(a, n)} in Schritten.`;
  const steps: Step[] = [{ text: `Zerlege die ${n}: ${h}, ${z} und ${e}.`, visual: malkreuz(a, [h, z, e]) }, `${mal(a, h)} = ${a * h}`, `${mal(a, z)} = ${a * z}; ${mal(a, e)} = ${a * e}`, `${a * h} + ${a * z} + ${a * e} = ${a * n}`];
  return {
    key: `drei:${a}:${n}`,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [`Zerlege die ${n} in ${h}, ${z} und ${e}.`, `Nimm alle Teile mal ${a}. Rechne die Ergebnisse dann plus.`],
    steps,
    bugs: multiBugs(
      [
        { id: 'zerlegen-einer', match: { e }, hint: `Nimm auch die ${e} mal ${a}.` },
        { id: 'zerlegen-einer', match: { s: a * h + a * z + e }, hint: `Nimm auch die ${e} mal ${a}.` },
        { id: 'teile-vergessen', match: { s: a * h + a * z }, hint: 'Zusammen heißt: Rechne alle Ergebnisse plus.' },
      ],
      fields,
    ),
    praise: `Du hast die ${n} in Hunderter, Zehner und Einer zerlegt.`,
    srText: spoken(prompt, spokenFields(fields)),
  };
}

function dreistelligDirekt(rng: Rng): Task {
  let t = dreistelligZahlen(rng);
  while (t.a * t.n > 1000) t = dreistelligZahlen(rng);
  const { a, n, h, z, e } = t;
  const v = a * n;
  const expression = `${mal(a, n)} = ${BOX}`;
  return {
    key: `drei-direkt:${a}:${n}`,
    prompt: 'Rechne in Schritten im Kopf.',
    expression,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Zerlege die ${n} in ${h}, ${z} und ${e}.`, `Rechne ${mal(a, h)}, dann ${mal(a, z)}, dann ${mal(a, e)}.`],
    steps: [{ text: `Zerlege die ${n}: ${h}, ${z} und ${e}.`, visual: malkreuz(a, [h, z, e]) }, `${mal(a, h)} = ${a * h}; ${mal(a, z)} = ${a * z}; ${mal(a, e)} = ${a * e}`, `Also: ${a * h} + ${a * z} + ${a * e} = ${v}.`],
    bugs: bugList(v, [
      ['zerlegen-einer', a * h + a * z + e, `Nimm auch die ${e} mal ${a}.`],
      ['zerlegen-einer', a * h + z + e, `Nimm auch ${z} und ${e} mal ${a}.`],
      ['teile-vergessen', a * h + a * z, `Das sind erst Hunderter und Zehner. Es fehlt noch ${mal(a, e)}.`],
    ]),
    praise: 'Du hast jede Stelle einzeln malgenommen.',
    srText: spoken('Rechne in Schritten im Kopf.', expression),
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

const teenFaktor = (rng: Rng): number => rng.pick([11, 12, 13, 14, 15, 16, 17, 18, 19]);
function zweistellig(rng: Rng): number {
  const b = rng.int(21, 49);
  return b % 10 === 0 ? b + 1 : b;
}
const zehnerzahl = (rng: Rng) => rng.int(2, 9) * 10;

const FORMS: Record<Stufe, Record<Ab, ((rng: Rng) => Task)[]>> = {
  1: {
    1: [(rng) => malZerlegt(...malPaar(rng, (r) => r.int(2, 5), teenFaktor), true)],
    2: [(rng) => malZerlegt(...malPaar(rng, (r) => r.int(3, 9), zweistellig), false)],
    3: [(rng) => malDirekt(rng.int(3, 9), zweistellig(rng)), (rng) => malLuecke(...malPaar(rng, (r) => r.int(3, 9), zweistellig))],
  },
  2: {
    1: [teilenZerlegt],
    2: [teilenZerlegt, teilenLuecke],
    3: [teilenDirekt],
  },
  3: {
    1: [(rng) => nachbar(10, 9, zehnerzahl(rng)), (rng) => nachbar(10, 11, zehnerzahl(rng)), (rng) => nachbar(5, 6, zehnerzahl(rng))],
    2: [dreistelligFelder],
    3: [dreistelligDirekt, (rng) => nachbarLuecke(rng.pick([4, 9]), zehnerzahl(rng))],
  },
};

export const inSchrittenSkill: SkillDef = {
  ...SKILL,
  title: 'Malnehmen und Teilen in Schritten',
  description: 'Du zerlegst eine Zahl und rechnest zwei leichte Aufgaben.',
  stufen: {
    1: 'Malnehmen in Schritten: 7 · 23 = 7 · 20 + 7 · 3',
    2: 'Teilen in Schritten: 96 : 4 = 80 : 4 + 16 : 4',
    3: 'Nachbaraufgaben und große Zahlen mal einer kleinen Zahl',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return finish(SKILL, stufe, ab, KMK, rng.pick(FORMS[stufe][ab])(rng));
  },
};
