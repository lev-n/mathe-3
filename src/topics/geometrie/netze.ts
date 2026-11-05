/**
 * Würfelnetze. All 35 free hexominoes are enumerated; a folding simulation decides which 11 are nets (./hexomino.ts).
 * Stufe 1: is this a net? Clear nets (a row of four) against clear non-nets (a 2 × 2 block, a row of five or six).
 * Stufe 2: all 11 nets and the other hexominoes, turned; complete a net on a small field.
 * Stufe 3: opposite faces, letters and a Spielwürfel; Quadernetz (Sachsen, BW, Bayern).
 * Filling the missing square: five squares of a net always have several completions on an open plane, so the field is the net's own box
 * and only tasks with exactly one completion inside that box are used.
 */
import type { Cell, Rng, Visual } from '../../core/types';
import { makeChoice, numberBugs } from '../shared';
import { correctLabel, jaNein, makeSkill, pictureChoice, zurWahl, type TaskFn, type TaskTable } from './common';
import { bounds, ck, cellSet, cellsId, describeCells, isConnected, shift, sortCells, transform } from './grid';
import { hasSquareBlock, hexominoes, isCubeNet, longestLine, oppositeCells } from './hexomino';

const FOLD_HINT = 'Falte im Kopf: Welches Quadrat ist der Boden?';
const FOLD_HINT_2 = 'Klappe die anderen Quadrate hoch. Liegen Flächen übereinander?';
const TOO_MANY_ON_TOP = 'Falte im Kopf: Liegen 2 Flächen übereinander?';
const FOLDS_FINE = 'Falte im Kopf: Jedes Quadrat findet eine eigene Seite.';

const nets = () => hexominoes().filter((h) => h.net);
const nonNets = () => hexominoes().filter((h) => !h.net);
const clearNets = () => nets().filter((h) => longestLine(h.cells) === 4);
const clearNonNets = () => nonNets().filter((h) => hasSquareBlock(h.cells) || longestLine(h.cells) >= 5);

const oriented = (rng: Rng, cells: readonly Cell[]): Cell[] => sortCells(transform(cells, rng.int(0, 7)));
const netVisual = (cells: readonly Cell[], faces?: (string | null)[], highlight?: number[]): Visual => ({ type: 'net', cells: [...cells], ...(faces ? { faces } : {}), ...(highlight ? { highlight } : {}) });

function whyNot(cells: readonly Cell[]): string {
  if (hasSquareBlock(cells)) return '4 Quadrate treffen sich an einer Ecke. So klappt das Falten nicht.';
  if (longestLine(cells) >= 5) return `${longestLine(cells)} Quadrate in einer Reihe sind zu lang für den Würfel.`;
  return 'Beim Falten liegen 2 Quadrate übereinander.';
}

/** Is this a net? `clear`: only shapes that are easy to judge. */
function isNet(clear: boolean): TaskFn {
  return ({ rng }) => {
    const yes = rng.chance(0.5);
    const pool = yes ? (clear ? clearNets() : nets()) : clear ? clearNonNets() : nonNets();
    const cells = oriented(rng, rng.pick(pool).cells);
    const prompt = 'Ist das ein Würfelnetz?';
    return {
      key: `ist-netz:${cellsId(cells)}`,
      prompt,
      visual: netVisual(cells),
      answer: jaNein(yes, yes ? FOLDS_FINE : TOO_MANY_ON_TOP),
      hints: [FOLD_HINT, FOLD_HINT_2],
      steps: yes ? ['Beim Falten findet jedes Quadrat eine eigene Seite.', 'Das ist ein Würfelnetz.'] : [whyNot(cells), 'Das ist kein Würfelnetz.'],
      praise: 'Du hast das Netz im Kopf gefaltet.',
      srText: `Netz aus 6 Quadraten. ${describeCells(cells)}. ${prompt}`,
    };
  };
}

function pickNet(clear: boolean): TaskFn {
  return ({ rng }) => {
    const right = oriented(rng, rng.pick(clear ? clearNets() : nets()).cells);
    const wrong = rng.sample(clear ? clearNonNets() : nonNets(), 3).map((h) => ({ visual: netVisual(oriented(rng, h.cells)), whyWrong: TOO_MANY_ON_TOP }));
    const answer = pictureChoice(rng, netVisual(right), wrong);
    const prompt = 'Welches Bild ist ein Würfelnetz?';
    return {
      key: `waehlen:${cellsId(right)}`,
      prompt,
      answer,
      hints: ['Alle Bilder haben 6 Quadrate. Das allein reicht nicht.', FOLD_HINT_2],
      steps: ['Falte jedes Bild im Kopf.', `Nur ${correctLabel(answer)} ergibt einen Würfel.`],
      praise: 'Du hast jedes Bild im Kopf gefaltet.',
      srText: `${prompt} ${zurWahl(answer)}`,
    };
  };
}

const pickNonNet: TaskFn = ({ rng }) => {
  const right = oriented(rng, rng.pick(nonNets()).cells);
  const wrong = rng.sample(nets(), 3).map((h) => ({ visual: netVisual(oriented(rng, h.cells)), whyWrong: FOLDS_FINE }));
  const answer = pictureChoice(rng, netVisual(right), wrong);
  const prompt = 'Welches Bild ist kein Würfelnetz?';
  return {
    key: `kein-netz:${cellsId(right)}`,
    prompt,
    answer,
    hints: [FOLD_HINT, 'Bei welchem Bild liegen beim Falten Flächen übereinander?'],
    steps: [whyNot(right), `Das ist ${correctLabel(answer)}.`],
    praise: 'Du hast jedes Bild im Kopf gefaltet.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

interface Completion {
  width: number;
  height: number;
  given: Cell[];
  missing: Cell;
}

let completionCache: Completion[] | null = null;

/** Every way to leave out one square of a net so that exactly one square inside the net's box completes it. */
export function completions(): Completion[] {
  if (completionCache) return completionCache;
  const out = new Map<string, Completion>();
  for (const h of nets()) {
    for (let t = 0; t < 8; t++) {
      const full = sortCells(transform(h.cells, t));
      const b = bounds(full);
      if (b.w > 6 || b.h > 6) continue;
      full.forEach((missing, i) => {
        const given = full.filter((_, j) => j !== i);
        if (!isConnected(given)) return;
        const taken = cellSet(given);
        let fits = 0;
        for (let y = 0; y < b.h; y++) {
          for (let x = 0; x < b.w; x++) if (!taken.has(ck([x, y])) && isConnected([...given, [x, y]]) && isCubeNet([...given, [x, y]])) fits++;
        }
        if (fits === 1) out.set(cellsId(full) + ck(missing), { width: b.w, height: b.h, given, missing });
      });
    }
  }
  completionCache = [...out.values()];
  return completionCache;
}

const completeNet: TaskFn = ({ rng }) => {
  const c = rng.pick(completions());
  const full = sortCells([...c.given, c.missing]);
  return {
    key: `ergaenzen:${cellsId(full)}:${ck(c.missing)}`,
    prompt: 'Im Feld fehlt 1 Quadrat zum Würfelnetz. Male das Quadrat an.',
    answer: { kind: 'cells', width: c.width, height: c.height, given: c.given, solution: [c.missing] },
    hints: ['Falte im Kopf: Welche Seite vom Würfel fehlt noch?', 'Probiere die Stelle im Kopf aus: Liegen Flächen übereinander?'],
    steps: ['Jetzt hat jede Seite vom Würfel ein eigenes Quadrat.', { text: 'So sieht das fertige Würfelnetz aus:', visual: netVisual(full, undefined, [full.findIndex((x) => ck(x) === ck(c.missing))]) }],
    praise: 'Du hast die fehlende Seite vom Würfel gefunden.',
    srText: `Feld mit ${c.width} Spalten und ${c.height} Zeilen. Vorgegeben: ${describeCells(c.given)}. Im Feld fehlt 1 Quadrat zum Würfelnetz. Male das Quadrat an.`,
  };
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const touching = (a: Cell, b: Cell): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

const oppositeLetter: TaskFn = ({ rng }) => {
  const cells = oriented(rng, rng.pick(nets()).cells);
  const letters = rng.shuffle(LETTERS);
  const opp = oppositeCells(cells);
  const i = rng.int(0, 5);
  const j = opp[i];
  const asked = letters[i];
  const right = letters[j];
  const options = letters.filter((_, k) => k !== i && k !== j).map((label) => ({
    label,
    whyWrong: touching(cells[letters.indexOf(label)], cells[i]) ? `${label} und ${asked} liegen im Netz nebeneinander. Nachbarn liegen nie gegenüber.` : `Falte im Kopf: ${label} und ${asked} treffen sich an einer Kante.`,
  }));
  const answer = makeChoice(rng, { label: right }, options, { max: 5, order: [...letters].filter((l) => l !== asked).sort() });
  answer.layout = 'symbols';
  const prompt = `Du faltest den Würfel. Welche Fläche liegt ${asked} gegenüber?`;
  return {
    key: `gegenueber:${cellsId(cells)}:${letters.join('')}:${asked}`,
    prompt,
    visual: netVisual(cells, letters, [i]),
    answer,
    hints: [`Lege ${asked} in Gedanken als Boden hin. Klappe die anderen Quadrate hoch.`, 'Welches Quadrat liegt dann ganz oben?'],
    steps: [`${asked} liegt unten. Die Nachbarn von ${asked} werden die Seiten.`, `Ganz oben liegt ${right}. ${asked} und ${right} liegen gegenüber.`],
    praise: 'Du hast die Fläche gegenüber im Kopf gefunden.',
    srText: `Würfelnetz mit Buchstaben. ${describeCells(cells)}. Die Buchstaben von links oben, Zeile für Zeile: ${letters.join(', ')}. ${prompt} ${zurWahl(answer)}`,
  };
};

/** Spielwürfel: opposite numbers add up to 7. */
const diceNet: TaskFn = ({ rng }) => {
  const cells = oriented(rng, rng.pick(nets()).cells);
  const opp = oppositeCells(cells);
  const pairs = rng.shuffle([[1, 6], [2, 5], [3, 4]]);
  const numbers: number[] = new Array(6).fill(0);
  let next = 0;
  cells.forEach((_, i) => {
    if (numbers[i] !== 0) return;
    const [a, b] = rng.chance(0.5) ? pairs[next] : [...pairs[next]].reverse();
    numbers[i] = a;
    numbers[opp[i]] = b;
    next++;
  });
  const i = rng.int(0, 5);
  const right = numbers[i];
  const faces = numbers.map((n, k) => (k === i ? '?' : String(n)));
  const neighbour = cells.findIndex((c) => touching(c, cells[i]));
  const context = 'Auf einem Spielwürfel ergeben die Zahlen gegenüber zusammen immer 7.';
  const prompt = 'Welche Zahl gehört auf das Fragezeichen?';
  return {
    key: `spielwuerfel:${cellsId(cells)}:${faces.join('')}`,
    context,
    prompt,
    visual: netVisual(cells, faces, [i]),
    answer: { kind: 'number', value: right, before: 'Zahl:' },
    bugs: numberBugs([
      { id: 'nachbar', match: 7 - numbers[neighbour], hint: 'Das Quadrat daneben liegt nicht gegenüber. Falte im Kopf.' },
      { id: 'gegenzahl', match: numbers[opp[i]], hint: 'Das ist die Zahl gegenüber. Beide Zahlen ergeben zusammen 7.' },
    ], right),
    hints: ['Falte im Kopf: Welches Quadrat liegt dem Fragezeichen gegenüber?', 'Rechne: 7 minus die Zahl gegenüber.'],
    steps: [`Dem Fragezeichen gegenüber liegt die ${numbers[opp[i]]}.`, `7 − ${numbers[opp[i]]} = ${right}`],
    praise: 'Du hast die Zahl gegenüber im Kopf gefunden.',
    srText: `Würfelnetz mit Zahlen, Zeile für Zeile: ${describeCells(cells)}. Die Zahlen von links oben: ${faces.join(', ').replace('?', 'Fragezeichen')}. ${context} ${prompt}`,
  };
};

// ─── Quadernetz ─────────────────────────────────────────────────────────────

interface Face {
  letter: string;
  cells: Cell[];
}

/** The Quader sizes that fit the net picture (at most 16 squares). */
const QUADER_SIZES: readonly [number, number, number][] = [[1, 1, 2], [1, 1, 3], [1, 2, 2]];

const rect = (x: number, y: number, w: number, h: number): Cell[] => {
  const out: Cell[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([x + i, y + j]);
  return out;
};

/**
 * The four faces in a strip, one cap above and one below (each over a face of its own width). The options make the ways a net fails
 * here: both caps on top, a top cap of the wrong depth, no cap below.
 */
function quaderFaces(a: number, b: number, c: number, topAt: number, bottomAt: number, opts: { bothOnTop?: boolean; topDepth?: number; noBottom?: boolean } = {}): Face[] {
  const widths = [a, b, a, b];
  const xs = widths.map((_, i) => widths.slice(0, i).reduce((s, w) => s + w, 0));
  const other = (w: number) => (w === a ? b : a);
  const faces: Face[] = widths.map((w, i) => ({ letter: LETTERS[i], cells: rect(xs[i], 0, w, c) }));
  const topW = widths[topAt];
  const topD = opts.topDepth ?? other(topW);
  faces.push({ letter: 'E', cells: rect(xs[topAt], -topD, topW, topD) });
  if (opts.noBottom) return faces;
  const botW = widths[bottomAt];
  const botD = other(botW);
  faces.push({ letter: 'F', cells: opts.bothOnTop ? rect(xs[bottomAt], -botD, botW, botD) : rect(xs[bottomAt], c, botW, botD) });
  return faces;
}

function facesVisual(faces: readonly Face[], labelled: boolean): Visual {
  const all = faces.flatMap((f) => f.cells);
  const b = bounds(all);
  const seen = new Set<string>();
  const cells: Cell[] = [];
  const labels: string[] = [];
  for (const f of faces) {
    for (const cell of shift(f.cells, -b.minX, -b.minY)) {
      if (seen.has(ck(cell))) continue;
      seen.add(ck(cell));
      cells.push(cell);
      labels.push(f.letter);
    }
  }
  return { type: 'net', cells, ...(labelled ? { faces: labels } : {}) };
}

const OPPOSITE_FACE: Readonly<Record<string, string>> = { A: 'C', C: 'A', B: 'D', D: 'B', E: 'F', F: 'E' };

const quaderOpposite: TaskFn = ({ rng }) => {
  const [a, b, c] = rng.pick(QUADER_SIZES);
  const top = rng.int(0, 3);
  const bottom = rng.int(0, 3);
  const asked = rng.pick(LETTERS);
  const right = OPPOSITE_FACE[asked];
  const answer = makeChoice(rng, { label: right }, LETTERS.filter((l) => l !== asked && l !== right).map((label) => ({ label, whyWrong: `Falte im Kopf: ${label} und ${asked} treffen sich an einer Kante.` })), { max: 5, order: LETTERS.filter((l) => l !== asked) });
  answer.layout = 'symbols';
  const context = 'Das ist ein Quadernetz. Gleiche Buchstaben gehören zu einer Fläche.';
  const prompt = `Welche Fläche liegt ${asked} gegenüber?`;
  const strip = 'ABCD'.includes(asked);
  return {
    key: `quader-gegenueber:${a}${b}${c}:${top}${bottom}:${asked}`,
    context,
    prompt,
    visual: facesVisual(quaderFaces(a, b, c, top, bottom), true),
    answer,
    hints: [strip ? `Geh in der langen Reihe von ${asked} aus 2 Flächen weiter.` : 'Eine Fläche liegt ganz oben im Netz, die andere ganz unten.', 'Falte im Kopf: Welche Fläche liegt ganz auf der anderen Seite?'],
    steps: [strip ? `Zwischen ${asked} und ${right} liegt in der Reihe 1 Fläche.` : 'E und F sind die Deckel oben und unten.', `${asked} und ${right} liegen gegenüber.`],
    praise: 'Du hast das Quadernetz im Kopf gefaltet.',
    srText: `Quadernetz mit den Flächen A bis F. Die Flächen A, B, C, D liegen in einer Reihe. E liegt darüber, F darunter. ${prompt} ${zurWahl(answer)}`,
  };
};

const quaderFaceSize: TaskFn = ({ rng }) => {
  const [a, b, c] = rng.pick(QUADER_SIZES);
  const top = rng.int(0, 3);
  const bottom = rng.int(0, 3);
  const faces = quaderFaces(a, b, c, top, bottom);
  const asked = rng.pick(LETTERS);
  const area = (l: string) => faces.find((f) => f.letter === l)!.cells.length;
  const n = area(OPPOSITE_FACE[asked]);
  const prompt = `Wie viele Kästchen hat die Fläche gegenüber von ${asked}?`;
  const neighbour = LETTERS.find((l) => l !== asked && l !== OPPOSITE_FACE[asked] && area(l) !== n);
  return {
    key: `quader-groesse:${a}${b}${c}:${top}${bottom}:${asked}`,
    context: 'Das ist ein Quadernetz. Gleiche Buchstaben gehören zu einer Fläche.',
    prompt,
    visual: facesVisual(faces, true),
    answer: { kind: 'number', value: n, unit: 'Kästchen' },
    bugs: numberBugs([neighbour !== undefined && { id: 'nachbar', match: area(neighbour), hint: 'Diese Fläche ist ein Nachbar. Gegenüber liegt eine gleich große Fläche.' }], n),
    hints: ['Beim Quader sind Flächen gegenüber immer gleich groß.', `Wie groß ist die Fläche ${asked} selbst?`],
    steps: [`${asked} und ${OPPOSITE_FACE[asked]} liegen gegenüber und sind gleich groß.`, `Die Fläche ${OPPOSITE_FACE[asked]} hat ${n} Kästchen.`],
    praise: 'Du hast gleich große Flächen gegenüber gefunden.',
    srText: `Quadernetz mit den Flächen A bis F. Die Flächen A, B, C, D liegen in einer Reihe. E liegt darüber, F darunter. Größen: ${LETTERS.map((l) => `${l} ${area(l)} Kästchen`).join(', ')}. ${prompt}`,
  };
};

const pickQuaderNet: TaskFn = ({ rng }) => {
  const [a, b, c] = rng.pick(QUADER_SIZES);
  const top = rng.int(0, 3);
  const bottom = rng.int(0, 3);
  const widths = [a, b, a, b];
  const depth = (w: number) => (w === a ? b : a);
  const wrongDepth = depth(widths[top]) === 1 ? 2 : depth(widths[top]) - 1;
  const cand = [
    { visual: facesVisual(quaderFaces(a, b, c, top, (top + 2) % 4, { bothOnTop: true }), false), whyWrong: 'Falte im Kopf: Oben liegen 2 Flächen übereinander. Unten fehlt eine.' },
    { visual: facesVisual(quaderFaces(a, b, c, top, bottom, { topDepth: wrongDepth }), false), whyWrong: 'Flächen gegenüber sind gleich groß. Vergleiche die Fläche oben und unten.' },
    { visual: facesVisual(quaderFaces(a, b, c, top, bottom, { noBottom: true }), false), whyWrong: 'Ein Quader hat 6 Flächen. Hier fehlt eine Fläche.' },
  ].filter((o) => (o.visual as Extract<Visual, { type: 'net' }>).cells.length <= 16);
  const answer = pictureChoice(rng, facesVisual(quaderFaces(a, b, c, top, bottom), false), cand, 'Netz');
  const prompt = 'Aus welchem Netz faltest du einen Quader?';
  return {
    key: `quader-netz:${a}${b}${c}:${top}${bottom}`,
    prompt,
    answer,
    hints: ['Ein Quader hat 6 Flächen. Flächen gegenüber sind gleich groß.', 'Falte im Kopf: Liegt je eine Fläche oben und unten?'],
    steps: ['In der Reihe liegen 4 Flächen rundherum.', 'Dazu kommen die Fläche oben und die Fläche unten, beide gleich groß.', `Das ist ${correctLabel(answer)}.`],
    praise: 'Du hast die Flächen des Quaders verglichen.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [isNet(true)],
    2: [isNet(true), pickNet(true)],
    3: [pickNet(true), isNet(false)],
  },
  2: {
    1: [isNet(true), pickNet(true)],
    2: [isNet(false), pickNet(false), completeNet],
    3: [pickNonNet, completeNet],
  },
  3: {
    1: [isNet(false), pickNet(false)],
    2: [oppositeLetter, pickNonNet, completeNet],
    3: [diceNet, quaderOpposite, quaderFaceSize, pickQuaderNet],
  },
};

export const netzeSkill = makeSkill({
  id: 'geometrie.netze',
  title: 'Würfelnetze',
  description: 'Du faltest im Kopf und prüfst, ob ein Würfel entsteht.',
  stufen: { 1: 'Ist das ein Würfelnetz? Klare Netze mit 6 Quadraten', 2: 'Alle 11 Netze und andere Formen, auch gedreht', 3: 'Flächen gegenüber finden; das Quadernetz' },
  kmk: ['RF.netze'],
}, TABLE);
