/**
 * Einmal außen herum: Umfang by walking around a figure, no formula.
 * Stufe 1: walk around a rectangle, count the edges, up to 20.
 * Stufe 2: composite figures; sides given in cm.
 * Stufe 3: mixed with Fläche: same area, different Umfang.
 */
import type { Cell, Rng, Visual } from '../../core/types';
import { makeChoice, multiBugs, numberBugs } from '../shared';
import { makeSkill, placeOnGrid, sumText, twoFigures, twoFiguresText, zurWahl, type TaskFn, type TaskTable } from './common';
import { borderCellCount, bounds, cellsId, describeCells, isSimpleFigure, outlineSides, perimeterOf, randomPolyomino, rectCells } from './grid';
import { compositeFigure } from './flaeche';

const HALF = 'Geh einmal ganz herum: Das sind 4 Seiten.';
/** The same for a figure with 6 or 8 sides. */
const HALF_FIGURE = 'Das ist nur der halbe Weg. Geh einmal ganz herum.';
const EDGES = 'Zähle die Kanten am Rand, nicht die Kästchen.';
/** docs/research.md §5 flaeche-umfang. */
const AREA = 'Umfang ist der Weg außen herum. Die Fläche liegt drinnen.';
const SWAPPED = AREA;
const WALK = 'Fahre mit dem Finger einmal außen herum.';
const SAME_AREA = 'Geh beide Wege ab. Der Umfang kann verschieden sein.';

/** One line of the walk; a wiggly figure has too many sides for one line (T16). */
function walkLine(sides: readonly number[], n: number): string {
  return sides.length <= 10 ? `Außen herum: ${sumText(sides)} = ${n}` : `Du zählst jede Kante am Rand einmal und kommst auf ${n}.`;
}

function rectSize(rng: Rng, maxPerimeter: number): [number, number] {
  for (;;) {
    const w = rng.int(2, 6);
    const h = rng.int(1, 5);
    if (2 * (w + h) <= maxPerimeter && w !== h) return [w, h];
  }
}

const walkRect: TaskFn = ({ rng }) => {
  const [w, h] = rectSize(rng, 20);
  const cells = rectCells({ x: 0, y: 0, w, h });
  const { visual } = placeOnGrid(cells);
  const n = 2 * (w + h);
  const prompt = 'Geh einmal außen um das Rechteck. Wie viele Kästchenkanten sind es?';
  return {
    key: `rechteck:${w}.${h}`,
    prompt,
    visual,
    answer: { kind: 'number', value: n, unit: 'Kanten' },
    bugs: numberBugs([
      { id: 'halb', match: w + h, hint: HALF },
      { id: 'flaeche', match: w * h, hint: AREA },
      { id: 'rand', match: borderCellCount(cells), hint: EDGES },
    ], n),
    hints: [WALK, 'Zähle jede Kante am Rand einmal, auch unten und links.'],
    steps: [`Oben ${w}, rechts ${h}, unten ${w}, links ${h}.`, `${sumText([w, h, w, h])} = ${n}`, `Der Weg außen herum hat ${n} Kanten.`],
    praise: 'Du bist einmal ganz um das Rechteck gegangen.',
    srText: `Rechteck im Kästchengitter, ${w} Kästchen breit und ${h} Kästchen hoch. ${prompt}`,
  };
};

const walkSquare: TaskFn = ({ rng }) => {
  const s = rng.int(2, 5);
  const cells = rectCells({ x: 0, y: 0, w: s, h: s });
  const { visual } = placeOnGrid(cells);
  const n = 4 * s;
  const prompt = 'Geh einmal außen um das Quadrat. Wie viele Kästchenkanten sind es?';
  return {
    key: `kanten-quadrat:${s}`,
    prompt,
    visual,
    answer: { kind: 'number', value: n, unit: 'Kanten' },
    bugs: numberBugs([
      { id: 'halb', match: 2 * s, hint: HALF },
      { id: 'flaeche', match: s * s, hint: AREA },
      { id: 'rand', match: borderCellCount(cells), hint: EDGES },
    ], n),
    hints: [WALK, 'Zähle jede Kante am Rand einmal, auch unten und links.'],
    steps: [`Oben ${s}, rechts ${s}, unten ${s}, links ${s}.`, `${sumText([s, s, s, s])} = ${n}`, `Der Weg außen herum hat ${n} Kanten.`],
    praise: 'Du bist einmal ganz um das Quadrat gegangen.',
    srText: `Quadrat im Kästchengitter, ${s} Kästchen breit und ${s} Kästchen hoch. ${prompt}`,
  };
};

/** Two rectangles, both walks within 20. */
const longerWalk: TaskFn = ({ rng }) => {
  for (;;) {
    const [w1, h1] = rectSize(rng, 20);
    const [w2, h2] = rectSize(rng, 20);
    if (w1 === w2 && h1 === h2) continue;
    const a = rectCells({ x: 0, y: 0, w: w1, h: h1 });
    const b = rectCells({ x: 0, y: 0, w: w2, h: h2 });
    const visual = twoFigures(a, b);
    const pa = perimeterOf(a);
    const pb = perimeterOf(b);
    const same = pa === pb;
    const right = same ? 'Beide gleich lang' : pa > pb ? 'Figur A' : 'Figur B';
    const labels = ['Figur A', 'Figur B', 'Beide gleich lang'];
    const answer = makeChoice(rng, { label: right }, labels.filter((l) => l !== right).map((label) => ({ label, whyWrong: 'Geh um beide Figuren herum. Vergleiche die beiden Wege.' })), { order: labels });
    const prompt = 'Welche Figur hat den längeren Weg außen herum?';
    return {
      key: `weg:${w1}.${h1}:${w2}.${h2}`,
      prompt,
      visual,
      answer,
      hints: [WALK, 'Zähle die Kanten um Figur A. Zähle dann die Kanten um Figur B.'],
      steps: [`Der Weg um Figur A hat ${pa} Kanten.`, `Der Weg um Figur B hat ${pb} Kanten.`, same ? 'Beide Wege sind gleich lang.' : `${right} hat den längeren Weg.`],
      praise: 'Du hast beide Wege abgezählt.',
      srText: `${twoFiguresText(visual, a.length)} ${prompt} ${zurWahl(answer)}`,
    };
  }
};

const rectInCm: TaskFn = ({ rng }) => {
  const w = rng.int(3, 9);
  const h = rng.int(2, Math.min(5, w - 1));
  const n = 2 * (w + h);
  const prompt = `Das Rechteck ist ${w} cm lang und ${h} cm breit. Wie lang ist der Umfang?`;
  const visual: Visual = { type: 'grid', width: w + 2, height: h + 2, cells: rectCells({ x: 1, y: 1, w, h }), showOutline: true, caption: '1 Kästchen: 1 cm' };
  return {
    key: `cm:${w}.${h}`,
    prompt,
    visual,
    answer: { kind: 'number', value: n, unit: 'cm' },
    bugs: numberBugs([
      { id: 'halb', match: w + h, hint: HALF },
      { id: 'flaeche', match: w * h, hint: AREA },
    ], n),
    hints: ['Das Rechteck hat 4 Seiten: 2 lange und 2 kurze.', 'Rechne alle 4 Seiten zusammen.'],
    steps: [`Die Seiten sind ${w} cm, ${h} cm, ${w} cm und ${h} cm lang.`, `${w} cm + ${h} cm + ${w} cm + ${h} cm = ${n} cm`, `Der Umfang ist ${n} cm lang.`],
    praise: 'Du hast alle 4 Seiten mitgerechnet.',
    srText: `Rechteck, ${w} Zentimeter lang und ${h} Zentimeter breit. Wie lang ist der Umfang?`,
  };
};

const squareInCm: TaskFn = ({ rng }) => {
  const s = rng.int(2, 9);
  const n = 4 * s;
  const prompt = `Jede Seite vom Quadrat ist ${s} cm lang. Wie lang ist der Umfang?`;
  return {
    key: `quadrat:${s}`,
    prompt,
    answer: { kind: 'number', value: n, unit: 'cm' },
    bugs: numberBugs([
      { id: 'halb', match: 2 * s, hint: HALF },
      { id: 'flaeche', match: s * s, hint: AREA },
    ], n),
    hints: ['Ein Quadrat hat 4 gleich lange Seiten.', 'Rechne alle Seiten zusammen oder rechne mal.'],
    steps: [`Das Quadrat hat 4 Seiten mit je ${s} cm.`, `4 · ${s} cm = ${n} cm`, `Der Umfang ist ${n} cm lang.`],
    praise: 'Du hast an alle 4 Seiten gedacht.',
    srText: `Jede Seite vom Quadrat ist ${s} Zentimeter lang. Wie lang ist der Umfang?`,
  };
};

/** A composite figure, in Kästchenkanten or with a scale in cm. */
function walkFigure(inCm: boolean): TaskFn {
  return ({ rng }) => {
    const f = compositeFigure(rng, 24);
    const n = perimeterOf(f.cells);
    const b = bounds(f.cells);
    const unit = inCm ? 'cm' : 'Kanten';
    const { visual, cells } = placeOnGrid(f.cells, inCm ? { caption: '1 Kästchen: 1 cm' } : {});
    const sides = outlineSides(f.cells);
    const prompt = inCm ? 'Jede Kästchenkante ist 1 cm lang. Wie lang ist der Umfang?' : 'Geh einmal außen um die Figur. Wie viele Kästchenkanten sind es?';
    return {
      key: `figur:${inCm ? 'cm' : 'kanten'}:${cellsId(f.cells)}`,
      prompt,
      visual,
      answer: { kind: 'number', value: n, unit },
      bugs: numberBugs([
        { id: 'flaeche', match: f.cells.length, hint: AREA },
        { id: 'rand', match: borderCellCount(f.cells), hint: EDGES },
        { id: 'halb', match: b.w + b.h, hint: HALF_FIGURE },
        { id: 'luecke', match: 2 * (b.w + b.h), hint: 'Geh auch in die Lücke hinein. Auch dort ist Rand.' },
      ], n),
      hints: [WALK, 'Geh auch in jede Lücke hinein. Merke dir deinen Anfang.'],
      steps: ['Du gehst von oben links im Uhrzeigersinn außen herum.', `${sumText(sides)} = ${n}`, `Der Umfang ist ${n} ${unit === 'cm' ? 'cm' : 'Kanten'} lang.`],
      praise: 'Du bist auch in die Lücken hineingegangen.',
      srText: `Figur im Kästchengitter. Angemalt: ${describeCells(cells)}. ${prompt}`,
    };
  };
}

/** Same Kästchen, different Umfang. */
function sameAreaPair(rng: Rng): { a: Cell[]; b: Cell[] } {
  for (;;) {
    const w = rng.int(3, 6);
    const h = rng.int(2, 4);
    const a = rectCells({ x: 0, y: 0, w, h });
    const b = randomPolyomino(rng, w * h, 5, 5);
    if (isSimpleFigure(b) && perimeterOf(a) !== perimeterOf(b)) return { a, b };
  }
}

const umfangOfSecond: TaskFn = ({ rng }) => {
  const { a, b } = sameAreaPair(rng);
  const visual = twoFigures(a, b);
  const n = perimeterOf(b);
  const pa = perimeterOf(a);
  const context = `Figur A und Figur B haben gleich viele Kästchen. Figur A hat den Umfang ${pa} Kanten.`;
  const prompt = 'Wie lang ist der Umfang von Figur B?';
  return {
    key: `zweite:${cellsId(a)}:${cellsId(b)}`,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value: n, unit: 'Kanten' },
    bugs: numberBugs([
      { id: 'gleicher-umfang', match: pa, hint: SAME_AREA },
      { id: 'flaeche', match: b.length, hint: AREA },
    ], n),
    hints: ['Gleich viele Kästchen heißt nicht: gleicher Umfang.', 'Geh selbst einmal außen um Figur B.'],
    steps: [`Figur B hat ${b.length} Kästchen, wie Figur A.`, walkLine(outlineSides(b), n), `Der Umfang von Figur B ist ${n} Kanten lang.`],
    praise: 'Du hast den Weg um Figur B selbst abgezählt.',
    srText: `${twoFiguresText(visual, a.length)} ${context} ${prompt}`,
  };
};

const longerUmfang: TaskFn = ({ rng }) => {
  const { a, b } = sameAreaPair(rng);
  const visual = twoFigures(a, b);
  const pa = perimeterOf(a);
  const pb = perimeterOf(b);
  const right = pa > pb ? 'Figur A' : 'Figur B';
  const labels = ['Figur A', 'Figur B', 'Beide gleich lang'];
  const answer = makeChoice(rng, { label: right }, labels.filter((l) => l !== right).map((label) => ({ label, whyWrong: label === 'Beide gleich lang' ? SAME_AREA : 'Geh um beide Figuren herum. Vergleiche die beiden Wege.' })), { order: labels });
  const prompt = 'Beide Figuren haben gleich viele Kästchen. Welche hat den längeren Umfang?';
  return {
    key: `laenger:${cellsId(a)}:${cellsId(b)}`,
    prompt,
    visual,
    answer,
    hints: ['Gleich viele Kästchen heißt nicht: gleicher Umfang.', 'Geh um Figur A und um Figur B. Vergleiche die Wege.'],
    steps: [`Der Umfang von Figur A ist ${pa} Kanten lang.`, `Der Umfang von Figur B ist ${pb} Kanten lang.`, `${right} hat den längeren Umfang.`],
    praise: 'Du hast beide Wege verglichen.',
    srText: `${twoFiguresText(visual, a.length)} ${prompt} ${zurWahl(answer)}`,
  };
};

const statement: TaskFn = ({ rng }) => {
  const { a, b } = sameAreaPair(rng);
  const visual = twoFigures(a, b);
  const prompt = 'Gleich viele Kästchen, also gleicher Umfang. Stimmt das bei diesen Figuren?';
  const answer = makeChoice(rng, { label: 'Nein' }, [{ label: 'Ja', whyWrong: SAME_AREA }], { order: ['Ja', 'Nein'] });
  return {
    key: `satz:${cellsId(a)}:${cellsId(b)}`,
    prompt,
    visual,
    answer,
    hints: ['Zähle zuerst die Kästchen beider Figuren.', 'Geh danach um beide Figuren herum.'],
    steps: [`Beide Figuren haben ${a.length} Kästchen.`, `Die Umfänge sind ${perimeterOf(a)} und ${perimeterOf(b)} Kanten lang.`, 'Der Satz stimmt also nicht.'],
    praise: 'Du hast den Satz an den Figuren geprüft.',
    srText: `${twoFiguresText(visual, a.length)} ${prompt}`,
  };
};

const EVERYDAY: readonly { thing: string; word: 'Umfang' | 'Fläche'; why: string }[] = [
  { thing: 'den Zaun um ein Beet', word: 'Umfang', why: 'Der Zaun läuft außen um das Beet.' },
  { thing: 'den Rahmen um ein Bild', word: 'Umfang', why: 'Der Rahmen läuft außen um das Bild.' },
  { thing: 'eine Lichterkette um ein Fenster', word: 'Umfang', why: 'Die Lichterkette läuft außen um das Fenster.' },
  { thing: 'die Borte um eine Decke', word: 'Umfang', why: 'Die Borte läuft außen um die Decke.' },
  { thing: 'den Teppich für ein Zimmer', word: 'Fläche', why: 'Der Teppich liegt drinnen auf dem Boden.' },
  { thing: 'die Fliesen für ein Bad', word: 'Fläche', why: 'Die Fliesen bedecken den ganzen Boden.' },
  { thing: 'den Rasen für einen Garten', word: 'Fläche', why: 'Der Rasen wächst überall im Garten.' },
  { thing: 'die Farbe für eine Wand', word: 'Fläche', why: 'Die Farbe bedeckt die ganze Wand.' },
];

const umfangOrFlaeche: TaskFn = ({ rng }) => {
  const item = rng.pick(EVERYDAY);
  const words = ['Umfang', 'Fläche'];
  const answer = makeChoice(rng, { label: item.word }, words.filter((w) => w !== item.word).map((label) => ({ label, whyWrong: SWAPPED })), { order: words });
  const prompt = `Du planst ${item.thing}. Was musst du wissen?`;
  return {
    key: `alltag:${item.thing}`,
    prompt,
    answer,
    hints: ['Liegt das Ding außen herum? Oder bedeckt das Ding die Fläche?', 'Umfang ist außen herum. Fläche ist drinnen.'],
    steps: [item.why, `Du musst also die ${item.word === 'Fläche' ? 'Fläche' : 'Länge vom Umfang'} wissen.`],
    praise: 'Du hast Umfang und Fläche unterschieden.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

/** Both numbers of one figure. */
const bothNumbers: TaskFn = ({ rng }) => {
  const f = compositeFigure(rng, 20);
  const area = f.cells.length;
  const p = perimeterOf(f.cells);
  const fields = [
    { id: 'f', value: area, before: 'Fläche:', after: 'Kästchen', label: 'Fläche' },
    { id: 'u', value: p, before: 'Umfang:', after: 'Kanten', label: 'Umfang' },
  ];
  const { visual, cells } = placeOnGrid(f.cells);
  const prompt = 'Wie groß sind Fläche und Umfang?';
  return {
    key: `beides:${cellsId(f.cells)}`,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    bugs: area === p ? [] : multiBugs([{ id: 'flaeche', match: { f: p, u: area }, hint: SWAPPED }], fields),
    hints: ['Für die Fläche zählst du die Kästchen drinnen.', 'Für den Umfang gehst du einmal außen herum.'],
    steps: [`Drinnen liegen ${area} Kästchen.`, walkLine(outlineSides(f.cells), p), `Die Fläche hat ${area} Kästchen. Der Umfang hat ${p} Kanten.`],
    praise: 'Du hast Fläche und Umfang getrennt bestimmt.',
    srText: `Figur im Kästchengitter. Angemalt: ${describeCells(cells)}. ${prompt}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [walkRect],
    2: [walkRect, walkSquare],
    3: [longerWalk],
  },
  2: {
    1: [walkRect, squareInCm],
    2: [walkFigure(false), walkFigure(true), rectInCm],
    3: [walkFigure(true), rectInCm],
  },
  3: {
    1: [walkFigure(false), rectInCm, umfangOrFlaeche],
    2: [umfangOfSecond, longerUmfang, bothNumbers],
    3: [statement, longerUmfang, bothNumbers, umfangOfSecond],
  },
};

export const umfangSkill = makeSkill({
  id: 'geometrie.umfang',
  title: 'Einmal außen herum',
  description: 'Du zählst den Weg rund um eine Figur.',
  stufen: { 1: 'Um ein Rechteck gehen und Kanten zählen, bis 20', 2: 'Figuren aus Rechtecken; Seiten in cm', 3: 'Mit Fläche gemischt: gleiche Fläche, anderer Umfang' },
  kmk: ['RF.flaeche'],
}, TABLE);
