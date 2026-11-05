/**
 * Bandornamente.
 * Stufe 1: continue an ornament with one rule.
 * Stufe 2: mirrored and shifted pieces: which comes next?
 * Stufe 3: find the wrong piece; Parkett: which piece fits?
 * A piece of a band has no mirror symmetry, so shifting, mirroring and turning it upside down look different.
 */
import type { Cell, ColorName, Rng, ShapeKind, Visual } from '../../core/types';
import { joinDe, makeChoice } from '../shared';
import { correctLabel, makeSkill, pictureChoice, placeOnGrid, zurWahl, type TaskFn, type TaskTable } from './common';
import { bounds, cellSet, cellsId, ck, describeCells, isConnected, normalize, randomPolyomino, shift, transform } from './grid';
import { canonicalId } from './hexomino';

const RULE = 'Such zuerst die Regel: Welche Teile wiederholen sich?';
const RULE_2 = 'Sprich die Reihe leise mit. Was kommt danach?';

const SHAPE_WORD: Partial<Record<ShapeKind, string>> = { quadrat: 'Quadrat', kreis: 'Kreis', dreieck: 'Dreieck' };
const COLOR_WORD: Readonly<Record<string, string>> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün' };
type Tile = { shape: ShapeKind; color: ColorName };
const tileName = (t: Tile) => `${SHAPE_WORD[t.shape]}, ${COLOR_WORD[t.color]}`;
const sameTile = (a: Tile, b: Tile) => a.shape === b.shape && a.color === b.color;

const rowNext: TaskFn = ({ rng }) => {
  const shapes: ShapeKind[] = ['quadrat', 'kreis', 'dreieck'];
  const colors: ColorName[] = ['rot', 'blau', 'gelb', 'gruen'];
  const all: Tile[] = shapes.flatMap((shape) => colors.map((color) => ({ shape, color })));
  const period = rng.int(2, 3);
  const unit = rng.sample(all, period);
  const shown = period * 2 + rng.int(0, period - 1);
  const items = Array.from({ length: shown }, (_, i) => unit[i % period]);
  const next = unit[shown % period];
  const others = [...unit.filter((t) => !sameTile(t, next)), ...rng.shuffle(all.filter((t) => !unit.some((u) => sameTile(u, t))))];
  const tile = (t: Tile): Visual => ({ type: 'shapeRow', items: [{ shape: t.shape, color: t.color }] });
  const answer = makeChoice(rng, { label: tileName(next), visual: tile(next) }, others.slice(0, 3).map((t) => ({ label: tileName(t), visual: tile(t), whyWrong: RULE })), { layout: 'grid' });
  const prompt = 'Was gehört auf den leeren Platz?';
  return {
    key: `reihe:${unit.map(tileName).join('-')}:${shown}`,
    prompt,
    visual: { type: 'shapeRow', items: [...items, {}] },
    answer,
    hints: [RULE, RULE_2],
    steps: [`Die Regel: ${joinDe(unit.map(tileName))}, immer wieder.`, `Nach ${items.length} Teilen kommt: ${tileName(next)}.`],
    praise: 'Du hast die Regel der Reihe gefunden.',
    srText: `Musterreihe: ${items.map(tileName).join('; ')}; dann ein leerer Platz. ${prompt} ${zurWahl(answer)}`,
  };
};

/**
 * Continue a band on the grid: columns repeat with `period`. Two full periods show the rule. Period 3 cannot show both and leave a column to
 * paint within the 6 columns of the field, so it shows 5 columns: 1 full period and 2 columns that repeat.
 */
function bandCells(height: number, period: number): TaskFn {
  return ({ rng }) => {
    const width = 6;
    const shownCols = Math.min(2 * period, width - 1);
    for (;;) {
      const unit: boolean[][] = Array.from({ length: period }, () => Array.from({ length: height }, () => rng.chance(0.45)));
      if (unit.some((col) => col.every((v) => !v))) continue;
      if (new Set(unit.map((col) => col.join())).size < period) continue;
      const cells: Cell[] = [];
      for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) if (unit[x % period][y]) cells.push([x, y]);
      const given = cells.filter(([x]) => x < shownCols);
      const solution = cells.filter(([x]) => x >= shownCols);
      if (solution.length === 0) continue;
      const visual: Visual = { type: 'grid', width, height, cells, showOutline: true };
      return {
        key: `band:${period}:${height}:${cellsId(given)}`,
        prompt: 'Setze das Muster bis zum rechten Rand fort.',
        answer: { kind: 'cells', width, height, given, solution },
        hints: ['Such das Stück mit der Wiederholung. Wie breit ist das Stück?', `Das Stück ist ${period} Spalten breit. Male Spalte für Spalte weiter.`],
        steps: [`Alle ${period} Spalten wiederholt sich das Muster.`, { text: 'So geht das Band weiter:', visual }],
        praise: 'Du hast das Stück gefunden und wiederholt.',
        srText: `Feld mit ${width} Spalten und ${height} Zeilen. Vorgegeben: ${describeCells(given)}. Setze das Muster bis zum rechten Rand fort.`,
      };
    }
  };
}

interface Motif {
  w: number;
  h: number;
  cells: Cell[];
  mirror: Cell[];
  upside: Cell[];
}

/** A piece whose mirror image and upside-down image both differ from it and from each other. */
function motif(rng: Rng): Motif {
  for (;;) {
    const cells = normalize(randomPolyomino(rng, rng.int(3, 5), 2, 3));
    const b = bounds(cells);
    if (b.w !== 2 || b.h !== 3) continue;
    const mirror = normalize(cells.map(([x, y]) => [b.w - 1 - x, y] as Cell));
    const upside = normalize(cells.map(([x, y]) => [x, b.h - 1 - y] as Cell));
    if (new Set([cellsId(cells), cellsId(mirror), cellsId(upside)]).size === 3) return { w: b.w, h: b.h, cells, mirror, upside };
  }
}

const GAP = 1;
const pieceAt = (cells: readonly Cell[], i: number, w: number) => shift(cells, i * (w + GAP), 0);

/** The band of pieces, with their numbers below when `numbered`. */
function band(m: Motif, pieces: readonly (readonly Cell[])[], numbered = false): Extract<Visual, { type: 'grid' }> {
  const cells = pieces.flatMap((p, i) => pieceAt(p, i, m.w));
  return {
    type: 'grid',
    width: pieces.length * (m.w + GAP) - GAP,
    height: m.h + (numbered ? 1 : 0),
    cells,
    showOutline: true,
    ...(numbered ? { labels: pieces.map((_, i) => ({ cell: [i * (m.w + GAP), m.h] as Cell, text: String(i + 1) })) } : {}),
  };
}

const WHY_SHIFT = 'Hier klappt nichts um. Das Teil rutscht nur weiter.';
const WHY_MIRROR = 'Das Bild klappt um. Links und rechts tauschen die Plätze.';
const WHY_UPSIDE = 'Oben und unten bleiben gleich. Das Teil steht hier auf dem Kopf.';

const nextPiece: TaskFn = ({ rng }) => {
  const m = motif(rng);
  const mirrored = rng.chance(0.5);
  const shown = rng.int(3, 4);
  const pieces = Array.from({ length: shown }, (_, i) => (mirrored && i % 2 === 1 ? m.mirror : m.cells));
  const next = mirrored && shown % 2 === 1 ? m.mirror : m.cells;
  const other = next === m.cells ? m.mirror : m.cells;
  const pic = (cells: readonly Cell[]) => placeOnGrid(cells).visual;
  const answer = pictureChoice(rng, pic(next), [
    { visual: pic(other), whyWrong: mirrored ? WHY_MIRROR : WHY_SHIFT },
    { visual: pic(m.upside), whyWrong: WHY_UPSIDE },
  ], 'Teil');
  const prompt = 'Welches Teil kommt als Nächstes?';
  const visual = band(m, pieces);
  return {
    key: `naechstes:${mirrored ? 'gespiegelt' : 'verschoben'}:${shown}:${cellsId(m.cells)}`,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche Teil 1 mit Teil 2: Klappt das Teil um oder rutscht es weiter?', 'Vergleiche auch Teil 2 mit Teil 3.'],
    steps: [mirrored ? 'Jedes Teil ist das Spiegelbild vom Teil davor.' : 'Jedes Teil rutscht nur weiter und sieht gleich aus.', `Als Nächstes kommt ${correctLabel(answer)}.`],
    praise: mirrored ? 'Du hast das Umklappen im Band erkannt.' : 'Du hast das Verschieben im Band erkannt.',
    srText: `Band aus ${shown} Teilen im Kästchengitter. Angemalt: ${describeCells(visual.cells)}. ${prompt} ${zurWahl(answer)}`,
  };
};

const ruleName: TaskFn = ({ rng }) => {
  const m = motif(rng);
  const mirrored = rng.chance(0.5);
  const pieces = Array.from({ length: 4 }, (_, i) => (mirrored && i % 2 === 1 ? m.mirror : m.cells));
  const word = mirrored ? 'gespiegelt' : 'verschoben';
  const words = ['verschoben', 'gespiegelt'];
  const answer = makeChoice(rng, { label: word }, words.filter((w) => w !== word).map((label) => ({ label, whyWrong: mirrored ? WHY_MIRROR : WHY_SHIFT })), { order: words });
  const prompt = 'Wie geht es von einem Teil zum nächsten Teil?';
  const visual = band(m, pieces);
  return {
    key: `regel:${word}:${cellsId(m.cells)}`,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche Teil 1 mit Teil 2.', 'Sieht Teil 2 gleich aus? Oder ist Teil 2 umgeklappt?'],
    steps: [mirrored ? 'Teil 2 ist umgeklappt: Links und rechts sind getauscht.' : 'Teil 2 sieht genauso aus wie Teil 1.', `Das Teil ist ${word}.`],
    praise: 'Du hast die Regel des Bandes benannt.',
    srText: `Band aus 4 Teilen im Kästchengitter. Angemalt: ${describeCells(visual.cells)}. ${prompt} ${zurWahl(answer)}`,
  };
};

/**
 * 5 pieces, and only piece 3 or 5 is wrong: pieces 1, 3 and 5 belong together, so 2 of the 3 show what the third should be. With fewer pieces,
 * or with piece 2 or 4 wrong, the band has only 2 pieces of that kind, and either one could be the wrong one under another rule.
 */
const wrongPiece: TaskFn = ({ rng }) => {
  const m = motif(rng);
  const mirrored = rng.chance(0.5);
  const count = 5;
  const expected = Array.from({ length: count }, (_, i) => (mirrored && i % 2 === 1 ? m.mirror : m.cells));
  const at = rng.pick([2, 4]);
  const pieces = [...expected];
  pieces[at] = m.upside;
  const visual = band(m, pieces, true);
  const right = `Teil ${at + 1}`;
  const answer = makeChoice(rng, { label: right }, expected.map((_, i) => `Teil ${i + 1}`).filter((l) => l !== right).map((label) => ({ label, whyWrong: 'Dieses Teil passt zur Regel. Prüfe die Teile der Reihe nach.' })), { max: count, order: expected.map((_, i) => `Teil ${i + 1}`) });
  const prompt = 'Ein Teil passt nicht zur Regel. Welches Teil ist das?';
  return {
    key: `fehlerteil:${mirrored ? 'gespiegelt' : 'verschoben'}:${at}:${cellsId(m.cells)}`,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche Teil 1 mit Teil 2. So findest du die Regel.', 'Prüfe dann die anderen Teile mit dieser Regel.'],
    steps: [mirrored ? 'Die Regel: Jedes Teil klappt um.' : 'Die Regel: Jedes Teil rutscht nur weiter.', `${right} steht auf dem Kopf und passt nicht.`],
    praise: 'Du hast jedes Teil mit der Regel verglichen.',
    srText: `Band aus ${count} Teilen im Kästchengitter. Angemalt: ${describeCells(visual.cells)}. ${prompt} ${zurWahl(answer)}`,
  };
};

const parkett: TaskFn = ({ rng }) => {
  for (;;) {
    const size = rng.int(3, 5);
    const gap = randomPolyomino(rng, size, 3, 3);
    const b = bounds(gap);
    const width = 6;
    const height = 5;
    const placed = shift(gap, rng.int(1, width - b.w - 1), rng.int(1, height - b.h - 1));
    const holes = cellSet(placed);
    const floor: Cell[] = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!holes.has(ck([x, y]))) floor.push([x, y]);
    const gapId = canonicalId(gap);
    const wrong: Cell[][] = [];
    for (let tries = 0; tries < 60 && wrong.length < 2; tries++) {
      const other = randomPolyomino(rng, rng.pick([size, size, size + 1, size - 1]), 3, 3);
      const id = canonicalId(other);
      if (other.length < 2 || id === gapId || wrong.some((w) => canonicalId(w) === id) || !isConnected(other)) continue;
      wrong.push(other);
    }
    if (wrong.length < 2) continue;
    // Only the 4 turns (t = 0 … 3) of the gap: the text says "gedreht", and a child does not flip a piece over.
    const answer = pictureChoice(rng, placeOnGrid(transform(gap, rng.int(0, 3))).visual, wrong.map((w) => ({ visual: placeOnGrid(transform(w, rng.int(0, 7))).visual, whyWrong: 'Dreh das Teil im Kopf. Deckt das Teil die Lücke ganz ab?' })), 'Teil');
    const prompt = 'Im Parkett ist eine Lücke. Welches Teil passt genau hinein?';
    return {
      key: `parkett:${cellsId(placed)}`,
      prompt,
      visual: { type: 'grid', width, height, cells: floor, showOutline: true },
      answer,
      hints: ['Zähle die Kästchen der Lücke.', 'Dreh jedes Teil im Kopf. Passt die Form genau?'],
      steps: [`Die Lücke hat ${size} Kästchen.`, `Gedreht passt ${correctLabel(answer)} genau hinein.`],
      praise: 'Du hast das Teil im Kopf gedreht.',
      srText: `Parkett im Kästchengitter, ${width} mal ${height} Kästchen. Leer sind: ${describeCells(placed)}. ${prompt} ${zurWahl(answer)}`,
    };
  }
};

const TABLE: TaskTable = {
  1: {
    1: [rowNext, bandCells(3, 2)],
    2: [rowNext, bandCells(3, 2)],
    3: [bandCells(4, 2), nextPiece],
  },
  2: {
    1: [rowNext, bandCells(3, 2)],
    2: [nextPiece, ruleName, bandCells(4, 2)],
    3: [wrongPiece, nextPiece, bandCells(4, 3)],
  },
  3: {
    1: [bandCells(4, 3), ruleName],
    2: [nextPiece, wrongPiece, parkett],
    3: [wrongPiece, parkett],
  },
};

export const musterSkill = makeSkill({
  id: 'geometrie.muster',
  title: 'Bandornamente',
  description: 'Du findest die Regel und setzt das Muster fort.',
  stufen: { 1: 'Ein Band mit einer Regel fortsetzen', 2: 'Gespiegelte und verschobene Teile: Was kommt als Nächstes?', 3: 'Das unpassende Teil finden; Parkett: Welches Teil passt?' },
  kmk: ['MS.muster'],
}, TABLE);
