/**
 * Spiegeln.
 * Stufe 1: find the axis: is the line a Spiegelachse, yes or no.
 * Stufe 2: complete the mirror image on the grid, vertical axis.
 * Stufe 3: horizontal axis; count the axes of a figure.
 * Figures are made from one half, mirrored, so an answer never depends on a drawn picture being looked at closely.
 */
import type { Axis, Cell, Rng, ShapeKind, Visual } from '../../core/types';
import { numberBugs, plural } from '../shared';
import { correctLabel, jaNein, makeSkill, pictureChoice, zurWahl, type TaskFn, type TaskTable } from './common';
import { bounds, ck, cellSet, cellsId, describeCells, isSymmetric, mirrorCell, randomPolyomino, shift } from './grid';
import { SHAPES } from './shapes';

type Orientation = Axis['orientation'];

const FOLD = 'Klappe das Bild in Gedanken an der Linie um.';
const FOLD_2 = 'Liegen dann alle Kästchen genau aufeinander?';
const SHIFTED = 'Das Bild klappt um. Links und rechts tauschen die Plätze.';
const SHIFTED_H = 'Das Bild klappt um. Oben und unten tauschen die Plätze.';
const OFF = 'Klappe in Gedanken um: Nicht alle Kästchen liegen aufeinander.';
const ON = 'Klappe in Gedanken um: Alle Kästchen liegen aufeinander.';

/** Swap columns and rows: turns a figure for a vertical axis into one for a horizontal axis. */
const swap = (cells: readonly Cell[]): Cell[] => cells.map(([x, y]) => [y, x] as Cell);

/** A half on the left of a vertical line at `at`, touching the line unless `gap`. */
function half(rng: Rng, n: number, at: number, height: number, gap = false): Cell[] {
  const cells = randomPolyomino(rng, n, Math.max(1, at - (gap ? 1 : 0)), height);
  const b = bounds(cells);
  const dx = at - 1 - (gap ? 1 : 0) - b.maxX;
  return shift(cells, dx, rng.int(0, height - b.h));
}

const mirrored = (cells: readonly Cell[], at: number): Cell[] => cells.map((c) => mirrorCell(c, 'vertical', at));

/** The grid of a figure for a vertical line; for a horizontal line the same figure with columns and rows swapped. */
function lined(cells: readonly Cell[], w: number, h: number, at: number, orientation: Orientation): Extract<Visual, { type: 'grid' }> {
  return orientation === 'vertical'
    ? { type: 'grid', width: w, height: h, cells: [...cells], axis: { orientation, at }, showOutline: true }
    : { type: 'grid', width: h, height: w, cells: swap(cells), axis: { orientation, at }, showOutline: true };
}

/** A symmetric figure with one more cell on the right side: not symmetric any more. */
function spoiled(rng: Rng, cells: readonly Cell[], at: number, w: number, h: number): Cell[] {
  const set = cellSet(cells);
  const free: Cell[] = [];
  for (const [x, y] of cells) {
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1]] as const) {
      const c: Cell = [x + dx, y + dy];
      if (c[0] >= at && c[0] < w && c[1] >= 0 && c[1] < h && !set.has(ck(c)) && !set.has(ck(mirrorCell(c, 'vertical', at)))) free.push(c);
    }
  }
  return free.length ? [...cells, rng.pick(free)] : cells.filter(([x, y]) => !(x >= at && y === cells[cells.length - 1][1]));
}

const lineKey = (o: Orientation) => (o === 'vertical' ? 's' : 'w');

/** Where the line lies, for srText: an axis at `at` runs between column (or row) `at` and the next one, counted from 1. */
const lineText = ({ orientation, at }: Axis): string => (orientation === 'vertical' ? `senkrecht zwischen Spalte ${at} und ${at + 1}` : `waagerecht zwischen Zeile ${at} und ${at + 1}`);

/** Is the line a Spiegelachse? */
function isAxis(orientation: Orientation): TaskFn {
  return ({ rng }) => {
    const at = 4;
    const w = 8;
    const h = 5;
    const left = half(rng, rng.int(3, 6), at, h);
    const whole = [...left, ...mirrored(left, at)];
    const form = rng.pick(['ja', 'ja', 'mehr', 'versetzt'] as const);
    let shown = whole;
    let lineAt = at;
    if (form === 'mehr') shown = spoiled(rng, whole, at, w, h);
    if (form === 'versetzt') lineAt = at + 1;
    const yes = isSymmetric(shown, 'vertical', lineAt);
    const visual = lined(shown, w, h, lineAt, orientation);
    const prompt = 'Ist die gestrichelte Linie eine Spiegelachse?';
    return {
      key: `achse:${lineKey(orientation)}:${cellsId(shown)}:${lineAt}`,
      prompt,
      visual,
      answer: jaNein(yes, yes ? ON : OFF),
      hints: [FOLD, FOLD_2],
      steps: yes ? ['Beim Umklappen liegen alle Kästchen genau aufeinander.', 'Die Linie ist eine Spiegelachse.'] : ['Beim Umklappen liegen nicht alle Kästchen aufeinander.', 'Die Linie ist keine Spiegelachse.'],
      praise: 'Du hast das Bild im Kopf umgeklappt.',
      srText: `Kästchengitter mit einer gestrichelten Linie. Die Linie liegt ${lineText(visual.axis!)}. Angemalt: ${describeCells(visual.cells)}. ${prompt}`,
    };
  };
}

/** Stufe 1 and 2 only, so no Parallelogramm (docs/research.md §2.2). The Dreieck twice: the answer stays Nein about as often. */
const AXIS_SHAPES: readonly ShapeKind[] = ['quadrat', 'rechteck', 'gleichseitiges-dreieck', 'sechseck', 'kreis', 'dreieck', 'dreieck'];

const shapeHasAxis: TaskFn = ({ rng }) => {
  const shape = rng.pick(AXIS_SHAPES);
  const yes = shape === 'kreis' || SHAPES[shape].achsen > 0;
  const prompt = 'Hat diese Figur eine Spiegelachse?';
  return {
    key: `figur:${shape}`,
    prompt,
    visual: { type: 'shape', shape },
    answer: jaNein(yes, yes ? 'Falte die Figur in Gedanken in der Mitte. Passen beide Teile aufeinander?' : 'Falte in Gedanken: Die Teile passen nie genau aufeinander.'),
    hints: ['Stell dir vor: Die Figur ist aus Papier. Du faltest die Figur.', 'Passen beide Teile genau aufeinander?'],
    steps: yes
      ? [{ text: 'Gefaltet passen beide Teile genau aufeinander.', visual: { type: 'shape', shape, showAxes: true } }, 'Die Figur hat eine Spiegelachse.']
      : ['Gefaltet passen die Teile nie genau aufeinander.', 'Die Figur hat keine Spiegelachse.'],
    praise: 'Du hast die Figur im Kopf gefaltet.',
    srText: `Die Figur hat ${SHAPES[shape].beschreibung}. ${prompt}`,
  };
};

/** Which picture is symmetric to its line? The others are copied or have one cell too many. */
const pickSymmetric: TaskFn = ({ rng }) => {
  const at = 3;
  const w = 6;
  const h = 4;
  for (;;) {
    const left = half(rng, rng.int(3, 5), at, h);
    const right = mirrored(left, at);
    const copied = [...left, ...shift(left, at, 0)];
    const whole = [...left, ...right];
    if (isSymmetric(copied, 'vertical', at)) continue;
    const answer = pictureChoice(rng, lined(whole, w, h, at, 'vertical'), [
      { visual: lined(copied, w, h, at, 'vertical'), whyWrong: SHIFTED },
      { visual: lined(spoiled(rng, whole, at, w, h), w, h, at, 'vertical'), whyWrong: OFF },
    ]);
    const prompt = 'In welchem Bild ist die Linie eine Spiegelachse?';
    return {
      key: `bild:${cellsId(whole)}`,
      prompt,
      answer,
      hints: [FOLD, FOLD_2],
      steps: ['Klappe jedes Bild an der Linie um.', `In ${correctLabel(answer)} liegen alle Kästchen aufeinander.`],
      praise: 'Du hast jedes Bild im Kopf umgeklappt.',
      srText: `${prompt} ${zurWahl(answer)}`,
    };
  }
};

/** Paint the mirror image. */
function paintMirror(orientation: Orientation, size: 'klein' | 'mittel' | 'gross', gap = false): TaskFn {
  return ({ rng }) => {
    const at = size === 'klein' ? 2 : 3;
    const w = at * 2;
    const h = size === 'klein' ? rng.int(3, 4) : rng.int(4, 6);
    const n = size === 'klein' ? rng.int(2, 3) : size === 'mittel' ? rng.int(3, 5) : rng.int(4, 7);
    const left = half(rng, n, at, h, gap);
    const right = mirrored(left, at);
    const given = orientation === 'vertical' ? left : swap(left);
    const solution = orientation === 'vertical' ? right : swap(right);
    const dims = orientation === 'vertical' ? { width: w, height: h } : { width: h, height: w };
    const otherSide = orientation === 'vertical' ? 'rechts' : 'unten';
    const visual: Visual = { type: 'grid', ...dims, cells: [...given, ...solution], axis: { orientation, at }, showOutline: true };
    return {
      key: `malen:${lineKey(orientation)}:${dims.width}.${dims.height}:${cellsId(given)}`,
      prompt: 'Male das Spiegelbild auf der anderen Seite der Linie an.',
      answer: { kind: 'cells', ...dims, given, solution, axis: { orientation, at } },
      hints: ['Wie weit ist ein Kästchen von der Linie weg?', `Male das Spiegelbild ${otherSide} genauso weit von der Linie weg.`],
      steps: [`Jedes Kästchen hat ${otherSide} den gleichen Abstand zur Linie.`, { text: 'So sieht das ganze Bild aus:', visual }],
      praise: 'Du hast auf den Abstand zur Linie geachtet.',
      srText: `Feld mit ${dims.width} Spalten und ${dims.height} Zeilen. Die Linie liegt ${lineText({ orientation, at })}. Vorgegeben: ${describeCells(given)}. Male das Spiegelbild auf der anderen Seite der Linie an.`,
    };
  };
}

/** Pick the mirror image: the copy is the classic mistake (docs/research.md §5 verschoben-statt-gespiegelt). */
function pickMirror(orientation: Orientation): TaskFn {
  return ({ rng }) => {
    const at = 3;
    const w = 6;
    const h = 4;
    for (;;) {
      const left = half(rng, rng.int(3, 5), at, h);
      const copied = shift(left, at, 0);
      const upside = mirrored(left, at).map(([x, y]) => [x, h - 1 - y] as Cell);
      const right = mirrored(left, at);
      const ids = [right, copied, upside].map(cellsId);
      if (new Set(ids).size < 3) continue;
      const picture = (cells: readonly Cell[]) => lined([...left, ...cells], w, h, at, orientation);
      const answer = pictureChoice(rng, picture(right), [
        { visual: picture(copied), whyWrong: orientation === 'vertical' ? SHIFTED : SHIFTED_H },
        { visual: picture(upside), whyWrong: 'Klappe an der Linie um. Das Bild steht sonst auf dem Kopf.' },
      ]);
      const prompt = 'In welchem Bild ist das Spiegelbild richtig?';
      return {
        key: `spiegelbild:${lineKey(orientation)}:${cellsId(left)}`,
        prompt,
        answer,
        hints: [FOLD, 'Kästchen an der Linie bleiben beim Umklappen an der Linie.'],
        steps: ['Jedes Kästchen klappt zur anderen Seite, im gleichen Abstand zur Linie.', `Das zeigt ${correctLabel(answer)}.`],
        praise: 'Du hast umgeklappt und nicht verschoben.',
        srText: `${prompt} ${zurWahl(answer)}`,
      };
    }
  };
}

/** The same figure with three lines: only one line is a Spiegelachse. */
const whichLine: TaskFn = ({ rng }) => {
  const at = 4;
  const w = 8;
  const h = 5;
  for (;;) {
    const left = half(rng, rng.int(3, 6), at, h);
    const whole = [...left, ...mirrored(left, at)];
    const others: Axis[] = [{ orientation: 'vertical', at: at + 1 }, { orientation: 'vertical', at: at - 1 }, { orientation: 'horizontal', at: 2 }, { orientation: 'horizontal', at: 3 }];
    const wrongLines = others.filter((a) => !isSymmetric(whole, a.orientation, a.at));
    if (wrongLines.length < 2) continue;
    const pic = (axis: Axis): Visual => ({ type: 'grid', width: w, height: h, cells: whole, axis, showOutline: true });
    const answer = pictureChoice(rng, pic({ orientation: 'vertical', at }), rng.sample(wrongLines, 2).map((a) => ({ visual: pic(a), whyWrong: OFF })));
    const prompt = 'In welchem Bild ist die Linie die Spiegelachse?';
    return {
      key: `linie:${cellsId(whole)}`,
      prompt,
      answer,
      hints: [FOLD, FOLD_2],
      steps: ['Klappe das Bild an jeder Linie um.', `Bei ${correctLabel(answer)} liegen alle Kästchen aufeinander.`],
      praise: 'Du hast jede Linie geprüft.',
      srText: `Die gleiche Figur mit verschiedenen Linien. ${prompt} ${zurWahl(answer)}`,
    };
  }
};

/** No Raute: ShapeVisual draws it close to a turned Quadrat, and by eye its 2 axes cannot be told from the 4 of a Quadrat. */
const COUNT_SHAPES: readonly ShapeKind[] = ['quadrat', 'rechteck', 'gleichseitiges-dreieck', 'sechseck', 'parallelogramm', 'dreieck'];
const OVER_CORNER = 'Auch über Eck kannst du diese Figur falten. Probiere das aus.';
const NOT_OVER_CORNER = 'Falte in Gedanken über Eck: Die Teile passen nicht aufeinander.';

const countShapeAxes: TaskFn = ({ rng }) => {
  const shape = rng.pick(COUNT_SHAPES);
  const n = SHAPES[shape].achsen;
  const bugs = shape === 'quadrat' ? [{ id: 'ohne-diagonale', match: 2, hint: OVER_CORNER }]
    : shape === 'rechteck' ? [{ id: 'diagonale', match: 4, hint: NOT_OVER_CORNER }]
      : shape === 'parallelogramm' ? [{ id: 'diagonale', match: 2, hint: NOT_OVER_CORNER }]
        : shape === 'sechseck' ? [{ id: 'ohne-diagonale', match: 3, hint: 'Falte von Ecke zu Ecke. Falte auch von Seite zu Seite.' }]
          : shape === 'gleichseitiges-dreieck' ? [{ id: 'ohne-diagonale', match: 1, hint: 'Von jeder Ecke läuft eine Falte zur Seite gegenüber.' }]
            : [{ id: 'diagonale', match: 1, hint: 'Falte in Gedanken: Die Teile passen nie genau aufeinander.' }];
  const prompt = 'Wie viele Spiegelachsen hat diese Figur?';
  return {
    key: `achsen-figur:${shape}`,
    prompt,
    // Not named: both Dreiecke are 'ein Dreieck', with different answers, so the aria-label gives the properties.
    visual: { type: 'shape', shape },
    answer: { kind: 'number', value: n, unit: 'Spiegelachsen' },
    bugs: numberBugs(bugs, n),
    hints: ['Falte die Figur in Gedanken von oben nach unten und von links nach rechts.', 'Falte auch über Eck. Passen beide Teile genau aufeinander?'],
    steps: n === 0
      ? ['Keine Falte passt genau aufeinander.', 'Die Figur hat 0 Spiegelachsen.']
      : [{ text: `So liegen die ${n} Falten:`, visual: { type: 'shape', shape, showAxes: true } }, `Die Figur hat ${n} Spiegelachsen.`],
    praise: 'Du hast die Figur in jede Richtung gefaltet.',
    srText: `Die Figur hat ${SHAPES[shape].beschreibung}. ${prompt}`,
  };
};

/** All four axes a grid figure can have: vertical and horizontal through the middle, and the two corner lines of a square box. */
export function axesOfCells(cells: readonly Cell[]): number {
  const b = bounds(cells);
  const set = cellSet(cells);
  const has = (f: (c: Cell) => Cell) => cells.every((c) => set.has(ck(f(c))));
  let n = 0;
  if (has(([x, y]) => [b.minX + b.maxX - x, y])) n++;
  if (has(([x, y]) => [x, b.minY + b.maxY - y])) n++;
  if (b.w === b.h) {
    if (has(([x, y]) => [b.minX + y - b.minY, b.minY + x - b.minX])) n++;
    if (has(([x, y]) => [b.maxX - (y - b.minY), b.maxY - (x - b.minX)])) n++;
  }
  return n;
}

const countGridAxes: TaskFn = ({ rng }) => {
  for (;;) {
    const quarter = randomPolyomino(rng, rng.int(2, 4), 3, 2);
    const q = bounds(quarter);
    const form = rng.pick(['beide', 'senkrecht', 'waagerecht']);
    const across = form === 'waagerecht' ? quarter : [...quarter, ...quarter.map(([x, y]) => [2 * q.w - 1 - x, y] as Cell)];
    const down = form === 'senkrecht' ? across : [...across, ...across.map(([x, y]) => [x, 2 * q.h - 1 - y] as Cell)];
    const cells = down;
    const n = axesOfCells(cells);
    if (n === 0 || new Set(cells.map(ck)).size !== cells.length) continue;
    const { w, h } = bounds(cells);
    if (w < 2 || h < 2) continue;
    const prompt = 'Wie viele Spiegelachsen hat diese Figur?';
    return {
      key: `achsen-gitter:${cellsId(cells)}`,
      prompt,
      visual: { type: 'grid', width: w + 2, height: h + 2, cells: shift(cells, 1, 1), showOutline: true },
      // No unit: "Spiegelachse" beside the field would say that the answer is 1.
      answer: { kind: 'number', value: n, before: 'Anzahl:' },
      bugs: numberBugs([n === 2 ? { id: 'nur-senkrecht', match: 1, hint: 'Prüfe beide Richtungen: senkrecht und waagerecht.' } : n === 4 ? { id: 'ohne-diagonale', match: 2, hint: OVER_CORNER } : null], n),
      hints: ['Falte die Figur in Gedanken in der Mitte, einmal senkrecht und einmal waagerecht.', 'Sieht die Figur wie ein Quadrat aus? Dann falte auch über Eck.'],
      steps: ['Du faltest in jede Richtung und prüfst die Teile.', `Die Figur hat ${n} ${plural(n, 'Spiegelachse', 'Spiegelachsen')}.`],
      praise: 'Du hast die Figur in jede Richtung gefaltet.',
      srText: `Kästchengitter. Angemalt: ${describeCells(shift(cells, 1, 1))}. ${prompt}`,
    };
  }
};

const TABLE: TaskTable = {
  1: {
    1: [isAxis('vertical'), shapeHasAxis],
    2: [isAxis('vertical'), pickSymmetric, shapeHasAxis],
    3: [pickSymmetric, paintMirror('vertical', 'klein')],
  },
  2: {
    1: [isAxis('vertical'), shapeHasAxis],
    2: [paintMirror('vertical', 'mittel'), pickMirror('vertical')],
    3: [paintMirror('vertical', 'gross', true), whichLine],
  },
  3: {
    1: [paintMirror('vertical', 'mittel'), isAxis('horizontal')],
    2: [paintMirror('horizontal', 'mittel'), pickMirror('horizontal'), countShapeAxes],
    3: [paintMirror('horizontal', 'gross', true), countShapeAxes, countGridAxes],
  },
};

export const symmetrieSkill = makeSkill({
  id: 'geometrie.symmetrie',
  title: 'Spiegeln',
  description: 'Du findest die Spiegelachse und ergänzt das Spiegelbild.',
  stufen: { 1: 'Die Spiegelachse finden: symmetrisch, ja oder nein', 2: 'Das Spiegelbild im Gitter ergänzen, senkrechte Linie', 3: 'Waagerechte Linie; Spiegelachsen einer Figur zählen' },
  kmk: ['RF.symmetrie'],
}, TABLE);
