/**
 * Flächen auslegen: count and compare Kästchen, no formula.
 * Stufe 1: count Kästchen of rectangles, up to 20.
 * Stufe 2: composite figures up to 30; which is larger?
 * Stufe 3: half Kästchen; same area, different shape.
 */
import type { Cell, ChoiceOption, Rng, Visual } from '../../core/types';
import { joinDe, makeChoice, numberBugs, plural } from '../shared';
import { correctLabel, kaestchen, makeSkill, pictureChoice, placeOnGrid, sumText, twoFigures, twoFiguresText, zurWahl, type TaskFn, type TaskTable } from './common';
import { borderCellCount, bounds, describeCells, lFigure, perimeterOf, randomPolyomino, rectCells, rectFigure, tFigure, transformFigure, uFigure, cellsId, type Figure, type HalfCell } from './grid';
import { canonicalId } from './hexomino';

const ROW_HINT = 'Zähle Reihe für Reihe.';
const PERIMETER_HINT = 'Das ist der Weg außen herum. Die Fläche liegt drinnen.';
const INSIDE_HINT = 'Du hast nur den Rand gezählt. Zähle auch die Kästchen innen.';

const areaAnswer = (n: number) => ({ kind: 'number', value: n, unit: 'Kästchen' }) as const;

/** A w × h rectangle within `max` cells. */
function rectSize(rng: Rng, max: number): [number, number] {
  for (;;) {
    const w = rng.int(2, 6);
    const h = rng.int(2, 5);
    if (w * h <= max && w * h >= 6) return [w, h];
  }
}

function countRect(max: number): TaskFn {
  return ({ rng }) => {
    const [w, h] = rectSize(rng, max);
    const cells = rectCells({ x: 0, y: 0, w, h });
    const { visual } = placeOnGrid(cells);
    const n = w * h;
    const prompt = 'Wie viele Kästchen hat das Rechteck?';
    return {
      key: `rechteck:${w}.${h}`,
      prompt,
      visual,
      answer: areaAnswer(n),
      bugs: numberBugs([
        { id: 'umfang', match: perimeterOf(cells), hint: PERIMETER_HINT },
        { id: 'plus', match: w + h, hint: 'Du hast Reihe plus Spalte gerechnet. Zähle alle Reihen.' },
        { id: 'rand', match: borderCellCount(cells), hint: INSIDE_HINT },
      ], n),
      hints: [ROW_HINT, 'Wie viele Reihen sind es? Wie viele Kästchen hat jede Reihe?'],
      steps: [`Das sind ${h} Reihen mit je ${w} Kästchen.`, `${h} · ${w} = ${n}`, `Das Rechteck hat ${n} Kästchen.`],
      praise: 'Du hast Reihe für Reihe gezählt.',
      srText: `Rechteck im Kästchengitter, ${w} Kästchen breit und ${h} Kästchen hoch. ${prompt}`,
    };
  };
}

/** Fill a rectangle: its first row and column are given, so only one rectangle fits. */
const fillRect: TaskFn = ({ rng }) => {
  const w = rng.int(3, 5);
  const h = rng.int(2, 4);
  const all = rectCells({ x: 0, y: 0, w, h });
  const given = all.filter(([x, y]) => x === 0 || y === 0);
  const solution = all.filter(([x, y]) => x > 0 && y > 0);
  const width = Math.min(6, w + 1);
  const height = Math.min(6, h + 1);
  const prompt = `Das Rechteck ist ${w} Kästchen breit und ${h} Kästchen hoch. Male die fehlenden Kästchen an.`;
  const visual: Visual = { type: 'grid', width, height, cells: all, showOutline: true };
  return {
    key: `auslegen:${w}.${h}`,
    prompt,
    answer: { kind: 'cells', width, height, given, solution },
    hints: ['Die obere Reihe und die linke Spalte sind schon fertig.', `Jede Reihe hat ${w} Kästchen. Male Reihe für Reihe an.`],
    steps: [`Du malst ${solution.length} Kästchen an. Zusammen sind es ${all.length} Kästchen.`, { text: 'So ist das Rechteck ganz ausgelegt:', visual }],
    praise: 'Du hast das Rechteck Reihe für Reihe ausgelegt.',
    srText: `Feld mit ${width} Spalten und ${height} Zeilen. Vorgegeben: ${describeCells(given)}. ${prompt}`,
  };
};

/** L, T or U in any position, made of rectangles the steps can name. */
export function compositeFigure(rng: Rng, max: number): Figure {
  for (;;) {
    const kind = rng.pick(['L', 'T', 'U', 'L']);
    let f: Figure;
    if (kind === 'L') {
      const W = rng.int(3, 6);
      const H = rng.int(3, 5);
      f = lFigure(W, H, rng.int(1, W - 1), rng.int(1, H - 1));
    } else if (kind === 'T') {
      const W = rng.pick([3, 5, 6]);
      f = tFigure(W, rng.int(1, 2), W % 2 ? rng.pick([1, 3].filter((s) => s < W)) : 2, rng.int(1, 3));
    } else {
      const H = rng.int(3, 4);
      f = uFigure(rng.int(1, 2), rng.int(1, 2), rng.int(1, 2), H, rng.int(1, H - 1));
    }
    const n = f.cells.length;
    if (n < 6 || n > max) continue;
    const b = bounds(f.cells);
    if (b.w > 6 || b.h > 6) continue;
    return transformFigure(f, rng.int(0, 7));
  }
}

function countComposite(max: number): TaskFn {
  return ({ rng }) => {
    const f = compositeFigure(rng, max);
    const n = f.cells.length;
    const b = bounds(f.cells);
    const { visual, cells } = placeOnGrid(f.cells);
    const sizes = f.parts.map((p) => p.w * p.h);
    const prompt = 'Wie viele Kästchen hat die Figur?';
    return {
      key: `figur:${cellsId(f.cells)}`,
      prompt,
      visual,
      answer: areaAnswer(n),
      bugs: numberBugs([
        { id: 'umfang', match: perimeterOf(f.cells), hint: PERIMETER_HINT },
        { id: 'ganzes', match: b.w * b.h, hint: 'Du hast ein ganzes Rechteck gerechnet. An der Figur fehlt ein Stück.' },
        { id: 'rand', match: borderCellCount(f.cells), hint: INSIDE_HINT },
      ], n),
      hints: ['Teile die Figur in Rechtecke.', 'Zähle jedes Rechteck für sich. Rechne dann plus.'],
      steps: [`Du teilst die Figur in ${sizes.length} Rechtecke.`, `Die Rechtecke haben ${joinDe(sizes.map(String))} Kästchen.`, `${sumText(sizes)} = ${n}`, `Die Figur hat ${n} Kästchen.`],
      praise: 'Du hast die Figur in Rechtecke zerlegt.',
      srText: `Figur im Kästchengitter. Angemalt: ${describeCells(cells)}. ${prompt}`,
    };
  };
}

/** Two figures that look different; the taller one is not always the larger one. */
const compareTwo: TaskFn = ({ rng }) => {
  for (;;) {
    const a = compositeFigure(rng, 20).cells;
    const equal = rng.chance(0.25);
    const target = equal ? a.length : a.length + rng.pick([-3, -2, -1, 1, 2, 3]);
    if (target < 6 || target > 24) continue;
    const b = randomPolyomino(rng, target, 5, 5);
    if (canonicalId(a) === canonicalId(b)) continue;
    const visual = twoFigures(a, b);
    const right = equal ? 'Beide gleich groß' : a.length > b.length ? 'Figur A' : 'Figur B';
    const why = 'Zähle in beiden Figuren alle Kästchen. Vergleiche die Zahlen.';
    const labels = ['Figur A', 'Figur B', 'Beide gleich groß'];
    const answer = makeChoice(rng, { label: right }, labels.filter((l) => l !== right).map<ChoiceOption>((label) => ({ label, whyWrong: why })), { order: labels });
    const prompt = 'Welche Figur hat mehr Kästchen?';
    return {
      key: `vergleich:${cellsId(a)}:${cellsId(b)}`,
      prompt,
      visual,
      answer,
      hints: ['Schätze nicht nach der Form. Zähle die Kästchen von Figur A.', 'Zähle danach die Kästchen von Figur B.'],
      steps: [`Figur A hat ${a.length} Kästchen. Figur B hat ${b.length} Kästchen.`, equal ? 'Beide Figuren sind gleich groß.' : `${right} hat mehr Kästchen.`],
      praise: 'Du hast gezählt, nicht nur geschaut.',
      srText: `${twoFiguresText(visual, a.length)} ${prompt} ${zurWahl(answer)}`,
    };
  }
};

const missingCells: TaskFn = ({ rng }) => {
  for (;;) {
    const a = compositeFigure(rng, 18).cells;
    const b = randomPolyomino(rng, a.length - rng.int(1, 4), 5, 5);
    if (b.length < 3) continue;
    const n = a.length - b.length;
    const visual = twoFigures(a, b);
    const context = 'Figur B soll genauso viele Kästchen haben wie Figur A.';
    const prompt = 'Wie viele Kästchen fehlen Figur B?';
    return {
      key: `fehlen:${cellsId(a)}:${cellsId(b)}`,
      context,
      prompt,
      visual,
      answer: areaAnswer(n),
      bugs: numberBugs([
        { id: 'ganze-figur', match: a.length, hint: 'Das ist die ganze Figur A. Gefragt ist nur der Unterschied.' },
        { id: 'ganze-figur', match: b.length, hint: 'Das ist die ganze Figur B. Gefragt ist nur der Unterschied.' },
      ], n),
      hints: ['Zähle die Kästchen von Figur A und von Figur B.', 'Rechne dann: größere Zahl minus kleinere Zahl.'],
      steps: [`Figur A hat ${a.length} Kästchen. Figur B hat ${b.length} Kästchen.`, `${a.length} − ${b.length} = ${n}`, `Figur B ${plural(n, 'fehlt', 'fehlen')} ${n} Kästchen.`],
      praise: 'Du hast beide Figuren genau verglichen.',
      srText: `${twoFiguresText(visual, a.length)} ${context} ${prompt}`,
    };
  }
};

/** A rectangle with a roof of half Kästchen on the top row, and optionally below. Half cells come in pairs: the area stays whole. */
function withHalves(rng: Rng): { cells: Cell[]; halves: HalfCell[]; full: number } {
  const w = rng.int(3, 5);
  const h = rng.int(1, 3);
  const body = rectCells({ x: 0, y: 1, w, h });
  const roof = rectCells({ x: 1, y: 0, w: w - 2, h: 1 });
  const halves: HalfCell[] = [{ cell: [0, 0], corner: 'br' }, { cell: [w - 1, 0], corner: 'bl' }];
  const cells = [...body, ...roof];
  if (rng.chance(0.4)) {
    cells.push(...rectCells({ x: 1, y: h + 1, w: w - 2, h: 1 }));
    halves.push({ cell: [0, h + 1], corner: 'tr' }, { cell: [w - 1, h + 1], corner: 'tl' });
  }
  return { cells, halves, full: cells.length };
}

const halfCells: TaskFn = ({ rng }) => {
  const { cells, halves, full } = withHalves(rng);
  const whole = halves.length / 2;
  const n = full + whole;
  const { visual, cells: placed } = placeOnGrid(cells, { halves });
  const prompt = 'Wie groß ist die Figur in Kästchen?';
  return {
    key: `halbe:${cellsId(cells)}:${halves.length}`,
    context: 'Zähle die halben Kästchen mit. 2 halbe Kästchen sind zusammen 1 ganzes Kästchen.',
    prompt,
    visual,
    answer: areaAnswer(n),
    bugs: numberBugs([
      { id: 'halbe-vergessen', match: full, hint: 'Die halben Kästchen gehören auch zur Figur.' },
      { id: 'halbe-ganz', match: full + halves.length, hint: 'Ein halbes Kästchen zählt nicht ganz. 2 halbe sind 1 ganzes.' },
    ], n),
    hints: ['Zähle zuerst die ganzen Kästchen.', 'Lege dann immer 2 halbe Kästchen zu 1 ganzen Kästchen zusammen.'],
    steps: [`Das sind ${full} ganze Kästchen.`, `Dazu kommen ${halves.length} halbe Kästchen. ${plural(whole, 'Das ist 1 ganzes', `Das sind ${whole} ganze`)}.`, `${full} + ${whole} = ${n}`, `Die Figur ist ${kaestchen(n)} groß.`],
    praise: 'Du hast halbe Kästchen richtig zusammengelegt.',
    srText: `Figur im Kästchengitter. Ganze Kästchen: ${describeCells(placed)}. Dazu ${halves.length} halbe Kästchen an den Ecken. Zähle die halben Kästchen mit. 2 halbe Kästchen sind zusammen 1 ganzes Kästchen. ${prompt}`,
  };
};

const sameArea: TaskFn = ({ rng }) => {
  for (;;) {
    const f = rng.chance(0.5) ? rectFigure(rng.int(2, 4), rng.int(3, 4)) : compositeFigure(rng, 14);
    const n = f.cells.length;
    const right = randomPolyomino(rng, n, 5, 4);
    if (canonicalId(right) === canonicalId(f.cells)) continue;
    const wrong = [n - 2, n - 1, n + 1, n + 2].filter((m) => m >= 3);
    const pieces = rng.sample(wrong, 2).map((m) => randomPolyomino(rng, m, 5, 4));
    const answer = pictureChoice(rng, placeOnGrid(right).visual, pieces.map((p) => ({ visual: placeOnGrid(p).visual, whyWrong: 'Zähle in dieser Figur alle Kästchen. Vergleiche mit der Figur oben.' })), 'Figur');
    const prompt = 'Welche Figur hat genauso viele Kästchen wie die Figur oben?';
    return {
      key: `gleich:${cellsId(f.cells)}:${cellsId(right)}`,
      prompt,
      visual: placeOnGrid(f.cells).visual,
      answer,
      hints: ['Zähle zuerst die Kästchen der Figur oben.', 'Die passende Figur kann anders aussehen. Zähle bei jeder Figur.'],
      steps: [`Die Figur oben hat ${n} Kästchen.`, `Auch ${correctLabel(answer)} hat ${n} Kästchen, aber eine andere Form.`],
      praise: 'Du hast gezählt und auf die Anzahl geachtet.',
      srText: `Eine Figur im Kästchengitter. Angemalt: ${describeCells(f.cells)}. ${prompt} ${zurWahl(answer)}`,
    };
  }
};

const TABLE: TaskTable = {
  1: {
    1: [countRect(20)],
    2: [countRect(20), fillRect],
    3: [countComposite(20), fillRect],
  },
  2: {
    1: [countRect(30), fillRect],
    2: [countComposite(30), compareTwo],
    3: [compareTwo, missingCells],
  },
  3: {
    1: [countComposite(30), compareTwo],
    2: [halfCells, sameArea, missingCells],
    3: [halfCells, sameArea],
  },
};

export const flaecheSkill = makeSkill({
  id: 'geometrie.flaeche',
  title: 'Flächen auslegen',
  description: 'Du legst mit Kästchen aus und vergleichst.',
  stufen: { 1: 'Kästchen zählen: Rechtecke bis 20', 2: 'Figuren aus Rechtecken bis 30; welche ist größer?', 3: 'Halbe Kästchen; gleich groß, andere Form' },
  kmk: ['RF.flaeche'],
}, TABLE);
