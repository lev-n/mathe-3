/**
 * Parallel und senkrecht (optional skill: BW, NRW, SN). The grid visual has no free lines, so a line is a strip one Kästchen wide.
 * Stufe 1: two lines on the grid; everyday lines.
 * Stufe 2: sides of a rectangle by letter; figures with parallel or senkrecht sides.
 * Stufe 3: which figure has two parallel pairs; riddles.
 * "Senkrecht" always means "at a right angle to the other line" here. The Achteck has senkrecht sides that do not meet, so it stays out of that question.
 */
import type { Cell, ChoiceOption, Rng, ShapeKind, Visual } from '../../core/types';
import { makeChoice, numberBugs } from '../shared';
import { cellsId, describeCells, rectCells } from './grid';
import { cap, correctLabel, jaNein, makeSkill, pictureChoice, zurWahl, type TaskFn, type TaskTable } from './common';
import { distractorNames, figuresOf, SHAPES } from './shapes';

const SWAPPED = 'Parallele Linien treffen sich nie. Senkrechte Linien bilden einen rechten Winkel.';
const WORDS = ['parallel', 'senkrecht'];
const HINT_MEET = 'Treffen sich die Linien? Oder laufen die Linien immer nebeneinander her?';
const HINT_ANGLE = 'Halte eine Papierecke an den Treffpunkt der Linien.';

const uniqueCells = (cells: readonly Cell[]): Cell[] => [...new Map(cells.map((c) => [`${c[0]},${c[1]}`, c] as const)).values()];

/** Two parallel strips, along or across the grid. */
function parallelStrips(rng: Rng): Cell[] {
  const a = rng.int(0, 1);
  const b = rng.int(a + 2, 4);
  const line = (at: number): Cell[] => {
    const from = rng.int(0, 1);
    const len = rng.int(3, 5 - from);
    return Array.from({ length: len }, (_, i) => [from + i, at] as Cell);
  };
  const cells = [...line(a), ...line(b)];
  return rng.chance(0.5) ? cells : cells.map(([x, y]) => [y, x] as Cell);
}

/** Two strips at a right angle: crossing or touching. */
function crossingStrips(rng: Rng): Cell[] {
  const row = rng.int(1, 3);
  const col = rng.int(1, 3);
  const top = rng.int(0, row);
  const bottom = rng.int(row, 4);
  const left = rng.int(0, col);
  const right = rng.int(col, 4);
  const across = Array.from({ length: right - left + 1 }, (_, i) => [left + i, row] as Cell);
  const down = Array.from({ length: bottom - top + 1 }, (_, i) => [col, top + i] as Cell);
  if (across.length < 3 || down.length < 3) return crossingStrips(rng);
  return uniqueCells([...across, ...down]);
}

const strips = (cells: readonly Cell[]): Visual => ({ type: 'grid', width: 5, height: 5, cells: [...cells], showOutline: true });

const twoLines: TaskFn = ({ rng }) => {
  const parallel = rng.chance(0.5);
  const cells = parallel ? parallelStrips(rng) : crossingStrips(rng);
  const word = parallel ? 'parallel' : 'senkrecht';
  const answer = makeChoice(rng, { label: word }, WORDS.filter((w) => w !== word).map((label) => ({ label, whyWrong: SWAPPED })), { order: WORDS });
  const prompt = 'Die 2 Streifen sind Linien. Wie liegen die Linien zueinander?';
  return {
    key: `linien:${word}:${cellsId(cells)}`,
    prompt,
    visual: strips(cells),
    answer,
    hints: [HINT_MEET, HINT_ANGLE],
    steps: parallel
      ? ['Die Linien laufen nebeneinander her und treffen sich nie.', 'Die Linien liegen parallel.']
      : ['Die Linien treffen sich und bilden einen rechten Winkel.', 'Die Linien liegen senkrecht zueinander.'],
    praise: parallel ? 'Du hast gesehen: Die Linien treffen sich nie.' : 'Du hast den rechten Winkel gesehen.',
    srText: `Zwei Streifen im Kästchengitter. Angemalt: ${describeCells(cells)}. ${prompt} ${zurWahl(answer)}`,
  };
};

const pickLines: TaskFn = ({ rng }) => {
  const parallel = rng.chance(0.5);
  const right = strips(parallel ? parallelStrips(rng) : crossingStrips(rng));
  const wrong = Array.from({ length: 2 }, () => ({ visual: strips(parallel ? crossingStrips(rng) : parallelStrips(rng)), whyWrong: SWAPPED }));
  const answer = pictureChoice(rng, right, wrong);
  const prompt = parallel ? 'In welchem Bild liegen die Linien parallel?' : 'In welchem Bild liegen die Linien senkrecht zueinander?';
  return {
    key: `bild:${parallel ? 'parallel' : 'senkrecht'}:${cellsId((right as Extract<Visual, { type: 'grid' }>).cells)}`,
    prompt,
    answer,
    hints: [parallel ? 'Parallele Linien treffen sich nie.' : 'Senkrechte Linien bilden einen rechten Winkel.', HINT_MEET],
    steps: [parallel ? 'In diesem Bild treffen sich die Linien nie.' : 'In diesem Bild bilden die Linien einen rechten Winkel.', `Richtig ist ${correctLabel(answer)}.`],
    praise: 'Du hast die Bilder genau verglichen.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const EVERYDAY: readonly { thing: string; nom: string; word: 'parallel' | 'senkrecht' }[] = [
  { thing: 'die 2 Schienen im Gleis', nom: 'Die Schienen', word: 'parallel' },
  { thing: 'die Linien im Schulheft', nom: 'Die Linien', word: 'parallel' },
  { thing: 'die obere und die untere Kante der Tür', nom: 'Die Kanten', word: 'parallel' },
  { thing: 'die weißen Streifen am Zebrastreifen', nom: 'Die Streifen', word: 'parallel' },
  { thing: 'die 2 Stangen der Leiter', nom: 'Die Stangen', word: 'parallel' },
  { thing: 'Tischbein und Tischplatte', nom: 'Tischbein und Tischplatte', word: 'senkrecht' },
  { thing: 'Fahnenstange und Boden', nom: 'Fahnenstange und Boden', word: 'senkrecht' },
  { thing: '2 Kanten an der Ecke vom Buch', nom: 'Die Kanten', word: 'senkrecht' },
  { thing: 'die Kante der Wand und der Boden', nom: 'Wand und Boden', word: 'senkrecht' },
];

const everyday: TaskFn = ({ rng }) => {
  const item = rng.pick(EVERYDAY);
  const answer = makeChoice(rng, { label: item.word }, WORDS.filter((w) => w !== item.word).map((label) => ({ label, whyWrong: SWAPPED })), { order: WORDS });
  const prompt = `Wie liegen ${item.thing} zueinander?`;
  return {
    key: `alltag:${item.thing}`,
    prompt,
    answer,
    hints: ['Stell dir die Dinge als Linien vor.', HINT_MEET],
    steps: [item.word === 'parallel' ? `${item.nom} treffen sich nie.` : `${item.nom} bilden einen rechten Winkel.`, `Also liegen die Linien ${item.word === 'parallel' ? 'parallel' : 'senkrecht zueinander'}.`],
    praise: 'Du hast die Linien im Alltag erkannt.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

/** A rectangle with its sides named a, b, c, d clockwise from the top. */
const SIDES = ['a', 'b', 'c', 'd'];
const sideParallel: TaskFn = ({ rng }) => {
  const w = rng.int(3, 5);
  const h = rng.pick([2, 3].filter((n) => n !== w));
  const s = rng.int(0, 3);
  const opposite = SIDES[(s + 2) % 4];
  const neighbours = [SIDES[(s + 1) % 4], SIDES[(s + 3) % 4]].sort();
  const side = SIDES[s];
  const asksParallel = rng.chance(0.5);
  const visual: Visual = {
    type: 'grid', width: w + 2, height: h + 2, cells: rectCells({ x: 1, y: 1, w, h }), showOutline: true,
    labels: [
      { cell: [1 + (w >> 1), 0], text: 'a' }, { cell: [w + 1, 1 + (h >> 1)], text: 'b' },
      { cell: [1 + (w >> 1), h + 1], text: 'c' }, { cell: [0, 1 + (h >> 1)], text: 'd' },
    ],
  };
  const pairText = neighbours.join(' und ');
  const correct = asksParallel ? `Seite ${opposite}` : `Seite ${pairText}`;
  const wrong: ChoiceOption[] = asksParallel
    ? neighbours.map((n) => ({ label: `Seite ${n}`, whyWrong: `Seite ${n} und Seite ${side} bilden einen rechten Winkel.` }))
    : [{ label: `Seite ${opposite}`, whyWrong: `Seite ${opposite} und Seite ${side} treffen sich nie.` }, { label: `Seite ${side} und ${opposite}`, whyWrong: `Seite ${opposite} und Seite ${side} treffen sich nie.` }];
  const answer = makeChoice(rng, { label: correct }, wrong);
  const prompt = asksParallel ? `Welche Seite ist parallel zu Seite ${side}?` : `Welche Seiten sind senkrecht zu Seite ${side}?`;
  return {
    key: `seite:${w}.${h}:${side}:${asksParallel ? 'parallel' : 'senkrecht'}`,
    prompt,
    visual,
    answer,
    hints: [`Fahre mit dem Finger an Seite ${side} entlang.`, asksParallel ? 'Welche Seite trifft diese Seite nie?' : 'Welche Seiten bilden mit dieser Seite einen rechten Winkel?'],
    steps: asksParallel
      ? [`Seite ${side} und Seite ${opposite} liegen gegenüber und treffen sich nie.`, `Parallel zu Seite ${side} ist Seite ${opposite}.`]
      : [`Seite ${side} trifft an den Ecken auf Seite ${pairText}.`, `Senkrecht zu Seite ${side} sind Seite ${pairText}.`],
    praise: 'Du hast die Seiten des Rechtecks genau geprüft.',
    srText: `Ein Rechteck im Kästchengitter. Die Seiten heißen im Uhrzeigersinn von oben a, b, c, d. ${prompt} ${zurWahl(answer)}`,
  };
};

const shapeVisual = (shape: ShapeKind, named = false): Visual => ({ type: 'shape', shape, ...(named ? { named } : {}) });
const IN_FIGURES: readonly ShapeKind[] = ['quadrat', 'rechteck', 'parallelogramm', 'raute', 'sechseck', 'dreieck', 'gleichseitiges-dreieck'];

const hasParallelSides: TaskFn = ({ rng, stufe }) => {
  const shape = rng.pick(figuresOf(stufe, IN_FIGURES));
  const yes = SHAPES[shape].paare > 0;
  const prompt = 'Hat diese Figur parallele Seiten?';
  return {
    key: `parallel:${shape}`,
    prompt,
    visual: shapeVisual(shape, true),
    answer: jaNein(yes, yes ? 'Schau auf die Seiten gegenüber: Treffen sich diese Seiten nie?' : 'Verlängere jede Seite im Kopf: Treffen sich die Seiten?'),
    hints: ['Parallele Seiten treffen sich nie, auch verlängert nicht.', 'Vergleiche immer 2 Seiten gegenüber.'],
    steps: yes ? [`${cap(SHAPES[shape].ein)} hat ${SHAPES[shape].paare} parallele Seitenpaare.`, 'Die Antwort ist Ja.'] : ['Verlängert treffen sich alle Seiten.', 'Die Antwort ist Nein.'],
    praise: 'Du hast die Seiten paarweise verglichen.',
    srText: `Flache Figur: ${SHAPES[shape].ein}. ${prompt}`,
  };
};

const hasRightAngleSides: TaskFn = ({ rng, stufe }) => {
  const shape = rng.pick(figuresOf(stufe, ['quadrat', 'rechteck', 'parallelogramm', 'sechseck', 'dreieck', 'gleichseitiges-dreieck']));
  const yes = SHAPES[shape].rechteWinkel > 0;
  const prompt = 'Hat diese Figur Seiten mit einem rechten Winkel dazwischen?';
  return {
    key: `senkrecht:${shape}`,
    prompt,
    visual: shapeVisual(shape, true),
    answer: jaNein(yes, yes ? 'Halte eine Papierecke an: Die Ecke passt genau.' : 'Halte eine Papierecke an: Die Ecken passen nicht genau.'),
    hints: ['Senkrechte Seiten bilden einen rechten Winkel.', 'Halte eine Papierecke an jede Ecke der Figur.'],
    steps: yes ? ['An jeder Ecke stehen die Seiten senkrecht zueinander.', 'Die Antwort ist Ja.'] : ['Die Papierecke passt an keine Ecke genau.', 'Die Antwort ist Nein.'],
    praise: 'Du hast die Ecken mit dem rechten Winkel verglichen.',
    srText: `Flache Figur: ${SHAPES[shape].ein}. ${prompt}`,
  };
};

const countPairs: TaskFn = ({ rng, stufe }) => {
  const shape = rng.pick(figuresOf(stufe, IN_FIGURES));
  const f = SHAPES[shape];
  const n = f.paare;
  const prompt = 'Wie viele Seitenpaare dieser Figur sind parallel?';
  return {
    key: `paare:${shape}`,
    prompt,
    visual: shapeVisual(shape, true),
    answer: { kind: 'number', value: n, unit: 'Seitenpaare' },
    bugs: numberBugs([{ id: 'seiten-statt-paare', match: f.ecken, hint: 'Ein Paar sind 2 Seiten. Du hast einzelne Seiten gezählt.' }], n),
    hints: ['Ein Seitenpaar sind 2 Seiten gegenüber.', 'Prüfe jedes Paar: Treffen sich die Seiten nie?'],
    steps: n === 0
      ? ['Verlängert treffen sich alle Seiten.', 'Diese Figur hat 0 parallele Seitenpaare.']
      : [`Die ${f.ecken} Seiten bilden Paare. Jedes Paar liegt gegenüber.`, `Diese Figur hat ${n} parallele Seitenpaare.`],
    praise: 'Du hast Seitenpaare gezählt, nicht einzelne Seiten.',
    srText: `Flache Figur: ${f.ein}. ${prompt}`,
  };
};

const pairsWhy = (s: ShapeKind): string => (s === 'kreis' ? 'Ein Kreis hat keine geraden Seiten.' : `Diese Figur hat ${SHAPES[s].paare} parallele Seitenpaare. Vergleiche die Seiten gegenüber.`);

/** Which figure has exactly n parallel pairs. */
const pickByPairs: TaskFn = ({ rng }) => {
  const n = rng.pick([2, 2, 2, 3, 0]);
  const fit: ShapeKind[] = n === 2 ? ['quadrat', 'rechteck', 'parallelogramm', 'raute'] : n === 3 ? ['sechseck'] : ['dreieck', 'gleichseitiges-dreieck'];
  const unfit: ShapeKind[] = (['dreieck', 'kreis', 'sechseck', 'achteck', 'rechteck', 'parallelogramm', 'gleichseitiges-dreieck'] as ShapeKind[]).filter((s) => SHAPES[s].paare !== n);
  const shape = rng.pick(fit);
  const answer = pictureChoice(rng, shapeVisual(shape), rng.sample(unfit, 3).map((s) => ({ visual: shapeVisual(s), whyWrong: pairsWhy(s) })), 'Figur');
  const prompt = n === 0 ? 'Bei welcher Figur ist kein Seitenpaar parallel?' : `Bei welcher Figur sind genau ${n} Seitenpaare parallel?`;
  return {
    key: `welche:${n}:${shape}`,
    prompt,
    answer,
    hints: ['Schau jede Figur einzeln an. Vergleiche die Seiten gegenüber.', 'Zähle bei jeder Figur die parallelen Seitenpaare.'],
    steps: [`${cap(SHAPES[shape].ein)} hat ${n} parallele Seitenpaare.`, `Richtig ist ${correctLabel(answer)}.`],
    praise: 'Du hast bei jeder Figur die Seitenpaare geprüft.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const RIDDLES: readonly { name: string; clue: string }[] = [
  { name: 'Parallelogramm', clue: 'Ich habe 4 Ecken. 2 Seitenpaare sind parallel. Ich habe keinen rechten Winkel.' },
  { name: 'Rechteck', clue: 'Ich habe 4 rechte Winkel. 2 Seitenpaare sind parallel. Ich habe 2 lange und 2 kurze Seiten.' },
  { name: 'Sechseck', clue: 'Ich habe 6 Seiten. 3 Seitenpaare sind parallel.' },
  { name: 'Dreieck', clue: 'Ich habe 3 Seiten. Kein Seitenpaar ist parallel.' },
  { name: 'Quadrat', clue: 'Meine Seiten sind alle gleich lang. 2 Seitenpaare sind parallel. Ich habe 4 rechte Winkel.' },
];

const riddle: TaskFn = ({ rng }) => {
  const item = rng.pick(RIDDLES);
  const others = distractorNames(item.name, [...RIDDLES.map((r) => r.name), 'Achteck', 'Kreis']);
  const answer = makeChoice(rng, { label: item.name }, rng.sample(others, 3).map((label) => ({ label, whyWrong: 'Prüfe jeden Satz an dieser Figur. Welcher Satz passt nicht?' })));
  const prompt = 'Wer bin ich?';
  return {
    key: `raetsel:${item.name}`,
    context: item.clue,
    prompt,
    answer,
    hints: ['Lies den ersten Satz. Welche Figuren passen?', 'Prüfe diese Figuren mit den anderen Sätzen.'],
    steps: ['Nur ein Name passt zu allen Sätzen.', `Die Figur heißt ${item.name}.`],
    praise: 'Du hast alle Sätze an den Figuren geprüft.',
    srText: `${item.clue} ${prompt} ${zurWahl(answer)}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [twoLines],
    2: [twoLines, pickLines, everyday],
    3: [everyday, hasParallelSides],
  },
  2: {
    1: [twoLines, pickLines],
    2: [sideParallel, hasParallelSides, hasRightAngleSides],
    3: [countPairs, sideParallel],
  },
  3: {
    1: [sideParallel, hasParallelSides, hasRightAngleSides],
    2: [countPairs, pickByPairs],
    3: [pickByPairs, riddle],
  },
};

export const parallelSenkrechtSkill = makeSkill({
  id: 'geometrie.parallel-senkrecht',
  title: 'Parallel und senkrecht',
  description: 'Du erkennst, wie zwei Linien zueinander liegen.',
  stufen: { 1: '2 Linien im Gitter: parallel oder senkrecht', 2: 'Solche Seiten in Figuren finden', 3: 'Welche Figur hat 2 parallele Seitenpaare?' },
  kmk: ['RF.linien'],
  optional: 'extra',
}, TABLE);
