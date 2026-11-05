/**
 * zahlen.tausenderbuch (Extra): a page of the Tausenderbuch has 10 numbers per row, so one to the right is 1 more and one down is 10 more
 * (docs/research.md §6). A page runs from x01 to x+1 00; the next page starts one row further down in the same column.
 * No cells answers (the catalogue lists number and choice): after a check the input marks every missing cell with '+', so the retry of a
 * painting would show its answer (core loop, §7.1). Where a child looks for a place, it chooses a field.
 */
import { BOX } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, numberBugs } from '../shared';
import { ausFormen, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.tausenderbuch', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'PK.darstellen'];

const HINT_ZEILE = 'Nach rechts kommt 1 dazu. Nach unten kommen 10 dazu.';

/** A page: 101 to 200, …, 901 to 1000. */
const seite = (rng: Rng) => rng.int(1, 9) * 100 + 1;
const zeileVon = (n: number, start: number) => Math.floor((n - start) / 10);
const spalteVon = (n: number, start: number) => (n - start) % 10;

/** A cell with neighbours on all four sides. */
const innen = (rng: Rng, start: number) => start + 10 * rng.int(1, 8) + rng.int(1, 8);

interface Richtung {
  name: string;
  d: number;
  gegen: string;
}

const RICHTUNGEN: Richtung[] = [
  { name: 'rechts neben', d: 1, gegen: 'Nach rechts kommt 1 dazu.' },
  { name: 'links neben', d: -1, gegen: 'Nach links ist es 1 weniger.' },
  { name: 'unter', d: 10, gegen: 'Nach unten kommen 10 dazu.' },
  { name: 'über', d: -10, gegen: 'Nach oben sind es 10 weniger.' },
];

/** The other way, and the other kind of step. */
const zeileBugs = (n: number, d: number, hint: string): Bug[] => [
  { id: 'zeile-spalte', match: n - d, hint },
  ...(Math.abs(d) === 1 ? [{ id: 'zeile-spalte', match: n + 10 * d, hint }] : []),
  ...(Math.abs(d) === 10 ? [{ id: 'zeile-spalte', match: n + d / 10, hint }] : []),
];

// ─── Stufe 1: one page ───────────────────────────────────────────────────────

const nachbarAufSeite = (richtungen: readonly Richtung[]): Form => (rng, stufe, ab) => {
  const start = seite(rng);
  const n = innen(rng, start);
  const r = rng.pick(richtungen);
  const value = n + r.d;
  const prompt = `Welche Zahl steht ${r.name} ${n}?`;
  return build(SKILL, stufe, {
    key: `nachbar:${n}:${r.d}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', start, masked: [value], marked: [n] },
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: [r.gegen, 'Die Zahl mit dem Ring ist der Anfang.'],
    steps: [r.gegen, `${n} ${r.d > 0 ? '+' : '−'} ${Math.abs(r.d)} = ${value}`],
    bugs: numberBugs(zeileBugs(n, r.d, r.gegen), value),
    praise: 'Du hast den Schritt auf der Seite richtig gerechnet.',
    srText: `Seite ${start} bis ${start + 99}. ${prompt}`,
    kmk: KMK,
  });
};

/** Any cell, or a cell at the left or right edge, where the number on one side belongs to another row. */
const leeresFeld = (amRand: boolean): Form => (rng, stufe, ab) => {
  const start = seite(rng);
  // never the first or last cell of a page: the name of the page says those two numbers, to the screen reader and in the picture's label
  const rechts = rng.chance(0.5);
  const value = amRand ? start + 10 * (rechts ? rng.int(0, 8) : rng.int(1, 9)) + (rechts ? 9 : 0) : start + rng.int(1, 98);
  const zeile = zeileVon(value, start);
  const spalte = spalteVon(value, start);
  return build(SKILL, stufe, {
    key: `feld:${value}`,
    ab,
    prompt: 'Welche Zahl gehört in das leere Feld?',
    visual: { type: 'hundredChart', start, masked: [value] },
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: ['Schau auf die Zahl daneben.', HINT_ZEILE],
    steps: [`Die Seite beginnt mit ${start}.`, `Das Feld ist in Reihe ${zeile + 1} und Spalte ${spalte + 1}.`, `Dort steht ${value}.`],
    bugs: numberBugs(zeileBugs(value, 1, HINT_ZEILE), value),
    praise: 'Du hast die Zahl aus den Nachbarn gefunden.',
    srText: `Seite ${start} bis ${start + 99}. Welche Zahl gehört in das leere Feld?`,
    kmk: KMK,
  });
};

/** Find a number on the page: the rows have no numbers, so the child looks for it and counts down. */
function reiheFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = seite(rng);
  const n = start + rng.int(0, 99);
  const value = zeileVon(n, start) + 1;
  const spalte = spalteVon(n, start) + 1;
  const prompt = `Zähle die Reihen von oben. In welcher Reihe steht ${n}?`;
  return build(SKILL, stufe, {
    key: `reihe:${n}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', start },
    answer: { kind: 'number', value, label: 'Reihe' },
    hints: ['Geh von oben Reihe für Reihe nach unten.', `Die erste Reihe endet mit ${start + 9}.`],
    steps: [`Die Seite beginnt mit ${start}.`, { text: `${n} steht in Reihe ${value}.`, visual: { type: 'hundredChart', start, marked: [n] } }],
    bugs: numberBugs([{ id: 'zeile-spalte', match: spalte, hint: 'Das ist die Spalte. Gefragt ist die Reihe von oben.' }], value),
    praise: 'Du hast die Zahl auf der Seite gefunden.',
    srText: `Seite ${start} bis ${start + 99}. ${prompt}`,
    kmk: KMK,
  });
}

// ─── Stufe 2: a cut-out piece ────────────────────────────────────────────────

/** A cross with one gap, a staircase with one gap, or a staircase with two gaps. */
const ausschnitt = (art: 'kreuz' | 'treppe' | 'zwei'): Form => (rng, stufe, ab) => {
  const start = seite(rng);
  const c = innen(rng, start);
  const kreuz = art === 'kreuz';
  const piece = kreuz ? [c - 10, c - 1, c, c + 1, c + 10] : [c - 10, c - 9, c, c + 1, c + 10, c + 11];
  // the gap is never the only number that tells the row: one cell stays shown next to it
  const luecke = rng.pick(piece.filter((n) => n !== c));
  const zweite = art === 'zwei' ? rng.pick(piece.filter((n) => n !== c && n !== luecke)) : null;
  const masked = zweite === null ? [luecke] : [luecke, zweite];
  const d = luecke - c;
  const prompt = masked.length === 1 ? 'Welche Zahl gehört in das leere Feld?' : 'Welche Zahl gehört in das Feld A?';
  return build(SKILL, stufe, {
    key: `stueck:${c}:${kreuz}:${masked.join(':')}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', start, piece, masked },
    answer: { kind: 'number', value: luecke, label: masked.length === 1 ? 'Zahl im leeren Feld' : 'Zahl im Feld A' },
    hints: [HINT_ZEILE, `Geh von ${c} aus.`],
    steps: [HINT_ZEILE, `${c} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${luecke}`],
    bugs: numberBugs(zeileBugs(c, d, HINT_ZEILE), luecke),
    praise: 'Du hast von der Zahl daneben aus gerechnet.',
    srText: `Ausschnitt einer Seite. ${prompt}`,
    kmk: KMK,
  });
};

const FELDER = ['A', 'B', 'C', 'D'];

/** Which of four fields holds the number. All four lie straight beside the middle, or all in the corners, so the kind of step stays to find. */
const feldFinden = (ecken: boolean): Form => (rng, stufe, ab) => {
  const start = seite(rng);
  const c = innen(rng, start);
  const d = rng.pick(ecken ? [11, -11, 9, -9] : [1, -1, 10, -10]);
  const value = c + d;
  const dy = Math.round(d / 10);
  const dx = d - 10 * dy;
  const wege = [dy !== 0 ? `${Math.abs(dy)} nach ${dy > 0 ? 'unten' : 'oben'}` : '', dx !== 0 ? `${Math.abs(dx)} nach ${dx > 0 ? 'rechts' : 'links'}` : ''].filter(Boolean).join(' und ');
  const cells = [c - 11, c - 10, c - 9, c - 1, c, c + 1, c + 9, c + 10, c + 11];
  const masked = (dx === 0 || dy === 0 ? [-10, -1, 1, 10] : [-11, -9, 9, 11]).map((s) => c + s);
  const right = FELDER[masked.indexOf(value)];
  const wrongs = masked.flatMap((n, i) => (n === value ? [] : [{ label: FELDER[i], whyWrong: `Dort steht ${n}. Rechne von ${c} aus.` }]));
  const prompt = `In der Mitte steht ${c}. In welchem Feld steht ${value}?`;
  return build(SKILL, stufe, {
    key: `wo:${c}:${d}`,
    ab,
    prompt,
    visual: { type: 'hundredChart', start, piece: cells, masked },
    answer: makeChoice(rng, { label: right }, wrongs, { layout: 'symbols', order: FELDER }),
    hints: ['Nach rechts kommt 1 dazu. Nach links geht 1 weg.', 'Nach unten kommen 10 dazu. Nach oben gehen 10 weg.'],
    steps: [d > 0 ? `${value} − ${c} = ${d}` : `${c} − ${value} = ${-d}`, `Der Weg ist ${wege}.`, { text: `${value} steht im Feld ${right}.`, visual: { type: 'hundredChart', start, piece: cells, marked: [value] } }],
    praise: 'Du hast den Weg im Tausenderbuch gefunden.',
    srText: `Ausschnitt einer Seite. ${prompt}`,
    kmk: KMK,
  });
};

// ─── Stufe 3: across pages, find the wrong number ────────────────────────────

/**
 * End of a page and below it the next page: the row that ends the page, and a gap 1 or 2 rows further down. Only the gap stands below the row: a number
 * beside it would solve it by + 1, with no page to cross. The column of the gap never holds the full hundred, so the Hunderter changes on the way.
 * 3 columns: at this type size 4 are already wider than a 375 px phone, and a gap in a cut-off column would be out of sight.
 */
function ueberSeiten(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const start = rng.int(1, 8) * 100 + 1;
  const ersteSpalte = rng.int(0, 7);
  const zeile = Array.from({ length: 3 }, (_, k) => start + 90 + ersteSpalte + k);
  const i = rng.pick([0, 1, 2].filter((k) => zeile[k] % 100 !== 0));
  const tiefe = rng.pick([1, 2]);
  const value = zeile[i] + 10 * tiefe;
  const leer = zeile.map(() => '');
  const visual: Visual = {
    type: 'table',
    caption: 'Ende einer Seite, darunter die nächste Seite',
    header: zeile.map(String),
    rows: Array.from({ length: tiefe }, (_, r) => (r === tiefe - 1 ? leer.map((t, k) => (k === i ? BOX : t)) : leer)),
  };
  return build(SKILL, stufe, {
    key: `seiten:${zeile[0]}:${value}`,
    ab,
    prompt: 'Die Tabelle geht über 2 Seiten. Welche Zahl gehört in die Lücke?',
    visual,
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: ['Eine Reihe tiefer sind es 10 mehr.', 'Bei einem neuen Hunderter beginnt eine neue Seite.'],
    steps: [`Von ${zeile[i]} sind es ${tiefe} ${tiefe === 1 ? 'Reihe' : 'Reihen'} nach unten.`, `${zeile[i]} + ${10 * tiefe} = ${value}`],
    bugs: numberBugs(
      [
        { id: 'zaehlen-hunderter', match: value - 100, hint: 'Auf der nächsten Seite ist der Hunderter 1 größer.' },
        { id: 'zeile-spalte', match: zeile[i], hint: 'Diese Zahl steht darüber. Darunter sind es mehr.' },
        tiefe === 2 && { id: 'zeile-spalte', match: zeile[i] + 10, hint: 'Das ist nur 1 Reihe tiefer. Die Lücke steht 2 Reihen tiefer.' },
      ],
      value,
    ),
    praise: 'Du hast auch über die Seite hinweg richtig gerechnet.',
    srText: `Eine Tabelle über 2 Seiten. Oben: ${zeile.join(', ')}. Die Lücke steht ${tiefe === 1 ? '1 Reihe' : '2 Reihen'} unter ${zeile[i]}. Welche Zahl gehört in die Lücke?`,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** A 3 × 3 piece around c in which a cell other than c shows the wrong number. */
function falscherAusschnitt(rng: Rng) {
  const start = seite(rng);
  const c = innen(rng, start);
  const cells = [c - 11, c - 10, c - 9, c - 1, c, c + 1, c + 9, c + 10, c + 11];
  const falsch = rng.pick(cells.filter((n) => n !== c));
  const hu = Math.floor(falsch / 100);
  const ze = Math.floor(falsch / 10) % 10;
  const ei = falsch % 10;
  // digits swapped, or the Hunderter of another page
  const gedreht = hu * 100 + ei * 10 + ze;
  const shows = gedreht !== falsch && !cells.includes(gedreht) && rng.chance(0.5) ? gedreht : falsch > 500 ? falsch - 100 : falsch + 100;
  const d = falsch - c;
  const visual: Visual = { type: 'hundredChart', start, piece: cells, replaced: [{ cell: falsch, shows }] };
  return { c, falsch, shows, d, visual, cells };
}

const HINTS_FALSCH = ['Prüfe jede Reihe: Nach rechts kommt immer 1 dazu.', 'Prüfe jede Spalte: Nach unten kommen immer 10 dazu.'];

function falscheZahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { c, falsch, shows, d, visual } = falscherAusschnitt(rng);
  return build(SKILL, stufe, {
    key: `passtnicht:${c}:${falsch}:${shows}`,
    ab,
    prompt: 'Eine Zahl im Ausschnitt passt nicht. Welche Zahl gehört dorthin?',
    visual,
    answer: { kind: 'number', value: falsch, label: 'Richtige Zahl' },
    hints: HINTS_FALSCH,
    steps: [`${shows} passt nicht in den Ausschnitt.`, `${c} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${falsch}`, `Dorthin gehört ${falsch}.`],
    bugs: numberBugs([{ id: 'zahl-schon-da', match: shows, hint: 'Diese Zahl steht schon dort. Welche Zahl passt in die Reihe?' }], falsch),
    praise: 'Du hast Reihen und Spalten geprüft.',
    srText: 'Eine Zahl im Ausschnitt passt nicht. Welche Zahl gehört dorthin?',
    kmk: [...KMK, 'PK.argumentieren'],
    knobel: true,
  });
}

function unpassendeWahl(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { c, falsch, shows, d, visual, cells } = falscherAusschnitt(rng);
  const wrongs = rng.sample(cells.filter((n) => n !== falsch), 3).map((n) => ({ label: String(n), whyWrong: `${n} passt. Prüfe auch die anderen Reihen und Spalten.` }));
  return build(SKILL, stufe, {
    key: `passtnichtwahl:${c}:${falsch}:${shows}`,
    ab,
    prompt: 'Eine Zahl im Ausschnitt passt nicht. Welche Zahl ist das?',
    visual,
    answer: makeChoice(rng, { label: String(shows) }, wrongs),
    hints: HINTS_FALSCH,
    steps: [`${c} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${falsch}`, `Dort steht ${shows}.`, `Also passt ${shows} nicht in den Ausschnitt.`],
    praise: 'Du hast Reihen und Spalten geprüft.',
    srText: 'Eine Zahl im Ausschnitt passt nicht. Welche Zahl ist das?',
    kmk: [...KMK, 'PK.argumentieren'],
    knobel: true,
  });
}

const WAAGERECHT = RICHTUNGEN.filter((r) => Math.abs(r.d) === 1);
const SENKRECHT = RICHTUNGEN.filter((r) => Math.abs(r.d) === 10);

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [nachbarAufSeite(WAAGERECHT)],
    2: [nachbarAufSeite(SENKRECHT), leeresFeld(false)],
    3: [reiheFinden, leeresFeld(true)],
  },
  2: {
    1: [ausschnitt('kreuz')],
    2: [ausschnitt('treppe'), feldFinden(false)],
    3: [ausschnitt('zwei'), feldFinden(true)],
  },
  3: {
    1: [ueberSeiten],
    2: [unpassendeWahl],
    3: [falscheZahl],
  },
};

export const tausenderbuchSkill: SkillDef = {
  ...SKILL,
  title: 'Tausenderbuch',
  description: 'Du findest dich auf einer Seite im Tausenderbuch zurecht.',
  stufen: {
    1: 'Eine Seite: eine Zahl finden, Nachbarn',
    2: 'Ausschnitte: 1 und 10 weiter, Lücken füllen',
    3: 'Über 2 Seiten rechnen und die unpassende Zahl finden',
  },
  kmk: KMK,
  optional: 'extra',
  generate: ausFormen(FORMEN),
};
