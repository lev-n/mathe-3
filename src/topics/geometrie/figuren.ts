/**
 * Figuren und rechte Winkel.
 * Stufe 1: name figures, also turned; count Ecken and Seiten.
 * Stufe 2: find rechte Winkel; a Quadrat is also a Rechteck.
 * Stufe 3: Parallelogramm (Sachsen); sort by properties; riddles.
 * A distractor is never a wider name for the drawn figure: a Quadrat is also a Rechteck, so naming a Quadrat offers no Rechteck.
 * No task names or draws the Raute: the catalogue of this skill does not teach it, and ShapeVisual draws it close to a turned Quadrat.
 */
import type { ChoiceOption, ShapeKind, Visual } from '../../core/types';
import { joinDe, makeChoice, numberBugs, plural } from '../shared';
import { cap, correctLabel, jaNein, makeSkill, pictureChoice, sum, sumText, zurWahl, type TaskCtx, type TaskFn, type TaskTable } from './common';
import { distractorNames, figuresOf, SHAPES, TURNS } from './shapes';

const PAPIERECKE = 'Halte eine Papierecke an jede Ecke der Figur.';
const PASST_ECKE = 'Passt die Papierecke genau? Dann ist die Ecke ein rechter Winkel.';

const NAMES = ['Quadrat', 'Rechteck', 'Dreieck', 'Kreis', 'Sechseck', 'Achteck'] as const;
const ECKEN_OF: Readonly<Record<string, number>> = { Quadrat: 4, Rechteck: 4, Dreieck: 3, Sechseck: 6, Achteck: 8 };

function whyNotName(name: string, shape: ShapeKind): string {
  if (shape === 'kreis') return `Ein ${name} hat Ecken. Diese Figur ist ganz rund.`;
  if (name === 'Kreis') return 'Ein Kreis hat keine Ecken. Diese Figur hat Ecken.';
  // Sechseck, Achteck and Dreieck can have equal sides too: only a figure with 4 Ecken is told from a Quadrat by its sides.
  if (name === 'Quadrat' && SHAPES[shape].ecken === 4) return 'Beim Quadrat sind alle Seiten gleich lang. Schau auf die Seiten.';
  return `Ein ${name} hat ${ECKEN_OF[name]} Ecken. Tippe jede Ecke einmal an.`;
}

const turnOf = (c: TaskCtx, shape: ShapeKind): number => (shape === 'kreis' ? 0 : c.rng.pick(TURNS));
const shapeVisual = (shape: ShapeKind, rotate: number, named = false): Visual => ({ type: 'shape', shape, ...(rotate ? { rotate } : {}), ...(named ? { named } : {}) });
const turned = (rotate: number): string => (rotate ? ' Die Figur ist gedreht.' : '');
/** For spoken text and steps: what the sides of a figure with 4 Ecken do not tell, whether its Ecken are rechte Winkel. */
const angleFact = (shape: ShapeKind): string => {
  if (SHAPES[shape].ecken !== 4) return '';
  return SHAPES[shape].rechteWinkel === 4 ? ' Alle 4 Ecken sind rechte Winkel.' : ' Keine Ecke ist ein rechter Winkel.';
};

const nameFigure: TaskFn = (c) => {
  const { rng } = c;
  const shape = rng.pick<ShapeKind>(['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'kreis', 'sechseck', 'achteck']);
  const rotate = turnOf(c, shape);
  const f = SHAPES[shape];
  const pool = distractorNames(f.name, NAMES);
  const answer = makeChoice(rng, { label: f.name }, rng.sample(pool, 3).map((n) => ({ label: n, whyWrong: whyNotName(n, shape) })));
  const prompt = 'Wie heißt diese Figur?';
  return {
    key: `name:${shape}:${rotate}`,
    prompt,
    visual: shapeVisual(shape, rotate),
    answer,
    // The same hints for every figure, and none presupposes an Ecke: the Kreis has none.
    hints: ['Hat die Figur Ecken? Dann tippe jede Ecke einmal an.', 'Hat die Figur gerade Seiten? Dann vergleiche die Längen.'],
    steps: [`Die Figur hat ${f.beschreibung}.`, `Die Figur heißt ${f.name}.`],
    praise: shape === 'kreis' ? 'Du hast die runde Form erkannt.' : rng.pick(['Du hast auf Ecken und Seiten geachtet.', 'Du hast die Figur an den Ecken erkannt.']),
    srText: `Die Figur hat ${f.beschreibung}.${turned(rotate)} ${prompt} ${zurWahl(answer)}`,
  };
};

/** The misconception of the turned Quadrat (docs/research.md §5 quadrat-gedreht). */
const turnedFigure: TaskFn = ({ rng }) => {
  const rotate = rng.pick([20, 30, 45, 60, 70]);
  const [shape, asked, why] = rng.pick<[ShapeKind, string, string]>([
    ['quadrat', 'Quadrat', 'Dreh das Bild im Kopf: Alle Seiten sind gleich lang.'],
    ['rechteck', 'Quadrat', 'Dreh das Bild im Kopf: 2 Seiten sind länger.'],
    ['rechteck', 'Rechteck', 'Dreh das Bild im Kopf: Die Ecken bleiben rechte Winkel.'],
  ]);
  const yes = SHAPES[shape].name === asked;
  const prompt = `Diese Figur ist gedreht. Ist diese Figur ein ${asked}?`;
  return {
    key: `gedreht:${shape}:${asked}:${rotate}`,
    prompt,
    visual: shapeVisual(shape, rotate),
    answer: jaNein(yes, why),
    hints: ['Dreh das Bild im Kopf, bis eine Seite waagerecht liegt.', asked === 'Rechteck' ? 'Prüfe danach die Ecken: Sind alle Ecken rechte Winkel?' : 'Vergleiche danach die Seiten: Sind alle gleich lang?'],
    steps: ['Drehen ändert die Figur nicht.', `Die Figur hat ${SHAPES[shape].beschreibung}.`, angleFact(shape).trim(), `Die Figur ist ${SHAPES[shape].ein}, also: ${yes ? 'Ja' : 'Nein'}.`],
    praise: 'Du hast die Figur im Kopf gedreht.',
    srText: `Die Figur hat ${SHAPES[shape].beschreibung}.${angleFact(shape)} Die Figur ist gedreht. Ist diese Figur ein ${asked}?`,
  };
};

const countCorners: TaskFn = (c) => {
  const { rng } = c;
  const shape = rng.pick<ShapeKind>(['quadrat', 'rechteck', 'dreieck', 'kreis', 'sechseck', 'achteck']);
  const part = shape === 'kreis' ? 'Ecken' : rng.pick(['Ecken', 'Seiten']);
  const rotate = turnOf(c, shape);
  const f = SHAPES[shape];
  const n = f.ecken;
  const prompt = `Wie viele ${part} hat diese Figur?`;
  return {
    key: `zaehlen:${part}:${shape}:${rotate}`,
    prompt,
    visual: shapeVisual(shape, rotate, true),
    answer: { kind: 'number', value: n, unit: part },
    hints: shape === 'kreis'
      ? ['Fahre mit dem Finger einmal am Rand entlang.', 'An einer Ecke macht der Rand einen Knick. Findest du einen Knick?']
      : part === 'Ecken'
        ? ['Tippe jede Ecke einmal an und zähle mit.', 'Merke dir die erste Ecke. Dort hörst du auf.']
        : ['Eine Seite ist eine gerade Linie von Ecke zu Ecke.', 'Fahre einmal rundherum. Merke dir die erste Seite.'],
    steps: shape === 'kreis'
      ? ['Der Kreis ist ganz rund.', 'Der Kreis hat 0 Ecken.']
      : [`Du gehst einmal rund um ${f.ein}.`, `Die Figur hat ${n} ${part}.`],
    praise: shape === 'kreis' ? 'Du hast den ganzen Rand geprüft.' : part === 'Ecken' ? 'Du hast jede Ecke einmal gezählt.' : 'Du hast jede Seite einmal gezählt.',
    srText: `Flache Figur: ${f.ein}.${turned(rotate)} ${prompt}`,
  };
};

const ROW_SHAPES: readonly ShapeKind[] = ['quadrat', 'rechteck', 'dreieck', 'kreis'];

const cornersTogether: TaskFn = ({ rng }) => {
  const shapes = Array.from({ length: rng.int(2, 3) }, () => rng.pick(ROW_SHAPES.slice(0, 3)));
  if (rng.chance(0.3)) shapes.push('kreis');
  const corners = shapes.map((s) => SHAPES[s].ecken);
  const n = sum(corners);
  const prompt = 'Wie viele Ecken haben alle Figuren zusammen?';
  return {
    key: `zusammen:${shapes.join('-')}`,
    prompt,
    visual: { type: 'shapeRow', items: shapes.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: n, unit: 'Ecken' },
    bugs: numberBugs([{ id: 'nur-figuren', match: shapes.length, hint: 'Du hast die Figuren gezählt. Wie viele Ecken hat jede Figur?' }], n),
    hints: ['Schau jede Figur einzeln an: Wie viele Ecken hat die Figur?', 'Rechne die Ecken aller Figuren zusammen.'],
    steps: [`Von links nach rechts: ${corners.join(', ')} Ecken.`, `${sumText(corners)} = ${n}`, `Die Figuren haben zusammen ${n} Ecken.`],
    praise: 'Du hast die Ecken jeder Figur mitgezählt.',
    srText: `Figuren in einer Reihe: ${joinDe(shapes.map((s) => SHAPES[s].name))}. ${prompt}`,
  };
};

const rightAngles: TaskFn = (c) => {
  const { rng, stufe } = c;
  const shape = rng.pick(figuresOf(stufe, ['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'parallelogramm', 'sechseck']));
  const rotate = turnOf(c, shape);
  const f = SHAPES[shape];
  const n = f.rechteWinkel;
  const prompt = 'Wie viele rechte Winkel hat diese Figur?';
  return {
    key: `winkel:${shape}:${rotate}`,
    prompt,
    visual: shapeVisual(shape, rotate, true),
    answer: { kind: 'number', value: n, unit: 'rechte Winkel' },
    bugs: numberBugs([{ id: 'ecken-statt-winkel', match: f.ecken, hint: 'Nicht jede Ecke ist ein rechter Winkel. Halte eine Papierecke an.' }], n),
    hints: [PAPIERECKE, PASST_ECKE],
    steps: n === 0
      ? ['Die Papierecke passt an keine Ecke genau.', 'Die Figur hat 0 rechte Winkel.']
      : ['Die Papierecke passt an jede Ecke genau.', `Die Figur hat ${n} rechte Winkel.`],
    praise: 'Du hast jede Ecke mit der Papierecke geprüft.',
    srText: `Flache Figur: ${f.ein}.${turned(rotate)} ${prompt}`,
  };
};

const WHY_NO_ANGLE = 'Halte eine Papierecke an diese Figur: Die Ecken passen nicht genau.';

/**
 * Picture options: the figure with 4 rechte Winkel, or the figure without one. All options lie the same way, so a turn never marks the right one.
 * Named: the prompt asks for a property that the aria-label would not state otherwise.
 */
const findRightAngles: TaskFn = (c) => {
  const { rng, stufe } = c;
  const noAngle = figuresOf(stufe, ['parallelogramm', 'dreieck', 'gleichseitiges-dreieck', 'sechseck', 'achteck']);
  const four = rng.chance(0.6);
  const shape: ShapeKind = four ? rng.pick<ShapeKind>(['quadrat', 'rechteck']) : rng.pick(noAngle);
  const rotate = rng.pick([0, 0, 30, 45]);
  const wrong = four
    ? rng.sample(noAngle, 3).map((s) => ({ visual: shapeVisual(s, rotate, true), whyWrong: WHY_NO_ANGLE }))
    : (['quadrat', 'rechteck'] as ShapeKind[]).map((s) => ({ visual: shapeVisual(s, rotate, true), whyWrong: 'Halte eine Papierecke an diese Figur: Die Ecken passen genau.' }));
  const answer = pictureChoice(rng, shapeVisual(shape, rotate, true), wrong, 'Figur');
  const prompt = four ? 'Welche Figur hat 4 rechte Winkel?' : 'Welche Figur hat keinen rechten Winkel?';
  return {
    key: `finden:${four ? 'vier' : 'kein'}:${shape}:${rotate}`,
    prompt,
    answer,
    hints: [PAPIERECKE, PASST_ECKE],
    steps: [`${cap(SHAPES[shape].ein)} hat ${SHAPES[shape].rechteWinkel} rechte Winkel.`, `Die passende Figur ist ${correctLabel(answer)}.`],
    praise: 'Du hast die Ecken der Figuren verglichen.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const SQUARE_RECT: readonly { key: string; prompt: string; shape?: ShapeKind; yes: boolean; why: string; step: string }[] = [
  { key: 'q-r', prompt: 'Das ist ein Quadrat. Ist das Quadrat auch ein Rechteck?', shape: 'quadrat', yes: true, why: 'Ein Rechteck hat 4 rechte Winkel. Prüfe das Quadrat.', step: 'Das Quadrat hat 4 rechte Winkel, also ist das Quadrat auch ein Rechteck.' },
  { key: 'r-q', prompt: 'Das ist ein Rechteck. Ist das Rechteck auch ein Quadrat?', shape: 'rechteck', yes: false, why: 'Beim Quadrat sind alle Seiten gleich lang. Schau auf die Seiten.', step: 'Hier sind 2 Seiten länger, also ist dieses Rechteck kein Quadrat.' },
  { key: 'jedes-q', prompt: 'Ist jedes Quadrat auch ein Rechteck?', yes: true, why: 'Ein Rechteck hat 4 rechte Winkel. Hat jedes Quadrat 4 rechte Winkel?', step: 'Jedes Quadrat hat 4 rechte Winkel, also ist jedes Quadrat ein Rechteck.' },
  { key: 'jedes-r', prompt: 'Ist jedes Rechteck auch ein Quadrat?', yes: false, why: 'Beim Quadrat sind alle Seiten gleich lang. Denk an ein langes Rechteck.', step: 'Ein langes Rechteck hat nicht 4 gleich lange Seiten.' },
];

const squareIsRect: TaskFn = ({ rng }) => {
  const item = rng.pick(SQUARE_RECT);
  return {
    key: `quadrat-rechteck:${item.key}`,
    prompt: item.prompt,
    ...(item.shape ? { visual: shapeVisual(item.shape, 0, true) } : {}),
    answer: jaNein(item.yes, item.why),
    hints: ['Ein Rechteck hat 4 rechte Winkel.', 'Ein Quadrat hat 4 rechte Winkel und 4 gleich lange Seiten.'],
    steps: [item.step, `Die Antwort ist ${item.yes ? 'Ja' : 'Nein'}.`],
    praise: 'Du hast Quadrat und Rechteck genau verglichen.',
    srText: item.prompt,
  };
};

/** Counting Rechtecke in a row: the Quadrate count as well. No unit: "Rechteck" beside the field would say that the answer is 1. */
const countRectangles: TaskFn = ({ rng }) => {
  const shapes = Array.from({ length: rng.int(4, 5) }, () => rng.pick(ROW_SHAPES));
  shapes[rng.int(0, shapes.length - 1)] = 'quadrat';
  const squares = shapes.filter((s) => s === 'quadrat').length;
  const rects = shapes.filter((s) => s === 'rechteck').length;
  const n = squares + rects;
  const prompt = 'Wie viele dieser Figuren sind Rechtecke?';
  return {
    key: `rechtecke:${shapes.join('-')}`,
    prompt,
    visual: { type: 'shapeRow', items: shapes.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: n, before: 'Anzahl:' },
    bugs: numberBugs([{ id: 'nur-rechtecke', match: rects, hint: 'Auch ein Quadrat ist ein Rechteck. Es hat 4 rechte Winkel.' }], n),
    hints: ['Ein Rechteck hat 4 rechte Winkel.', 'Prüfe jede Figur: Hat die Figur 4 rechte Winkel?'],
    steps: [`Du siehst ${plural(rects, '1 längliches Rechteck', `${rects} längliche Rechtecke`)} und ${squares} ${plural(squares, 'Quadrat', 'Quadrate')}.`, 'Jedes Quadrat ist auch ein Rechteck.', `${rects} + ${squares} = ${n}`],
    praise: 'Du hast auch die Quadrate mitgezählt.',
    srText: `Figuren in einer Reihe: ${joinDe(shapes.map((s) => SHAPES[s].name))}. ${prompt}`,
  };
};

const nameParallelogram: TaskFn = ({ rng }) => {
  const rotate = rng.pick([0, 0, 20, 45, 70]);
  const pool: ChoiceOption[] = [
    { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 rechte Winkel. Hier sind die Ecken schief.' },
    { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken. Tippe jede Ecke einmal an.' },
    { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Ecken. Tippe jede Ecke einmal an.' },
  ];
  const answer = makeChoice(rng, { label: 'Parallelogramm' }, rng.sample(pool, 3));
  const prompt = 'Wie heißt diese Figur?';
  return {
    key: `parallelogramm:${rotate}`,
    prompt,
    visual: shapeVisual('parallelogramm', rotate),
    answer,
    hints: ['Tippe jede Ecke an: Wie viele Ecken hat die Figur?', 'Halte eine Papierecke an. Sind die Ecken rechte Winkel?'],
    steps: ['Die Figur hat 4 Ecken, aber keinen rechten Winkel.', 'Die gegenüber liegenden Seiten sind gleich lang.', 'Die Figur heißt Parallelogramm.'],
    praise: 'Du hast die schiefen Ecken erkannt.',
    srText: `Die Figur hat ${SHAPES.parallelogramm.beschreibung}.${turned(rotate)} ${prompt} ${zurWahl(answer)}`,
  };
};

const parallelogramFacts: TaskFn = ({ rng }) => {
  const answer = makeChoice(rng, { label: 'Die gegenüber liegenden Seiten sind gleich lang.' }, rng.sample<ChoiceOption>([
    { label: 'Alle 4 Ecken sind rechte Winkel.', whyWrong: 'Halte eine Papierecke an: Die Ecken passen nicht genau.' },
    { label: 'Alle 4 Seiten sind gleich lang.', whyWrong: 'Vergleiche die Seiten: Oben und unten sind länger.' },
    { label: 'Die Figur hat 3 Ecken.', whyWrong: 'Tippe jede Ecke einmal an und zähle mit.' },
  ], 3));
  const prompt = 'Das ist ein Parallelogramm. Welcher Satz stimmt?';
  return {
    key: 'satz',
    prompt,
    visual: shapeVisual('parallelogramm', 0, true),
    answer,
    hints: ['Vergleiche die Seite oben mit der Seite unten.', 'Vergleiche danach die Seite links mit der Seite rechts.'],
    steps: ['Oben und unten sind gleich lang. Links und rechts sind gleich lang.', 'Der Satz mit den gegenüber liegenden Seiten stimmt.'],
    praise: 'Du hast die Seiten paarweise verglichen.',
    srText: `Flache Figur: ein Parallelogramm. ${prompt} ${zurWahl(answer)}`,
  };
};

const pickParallelogram: TaskFn = ({ rng }) => {
  const rotate = rng.pick([0, 20, 45]);
  // Rechteck and Quadrat are special Parallelogramme, so they are no distractors here. All options lie the same way (the Kreis looks the same when turned).
  const wrong = rng.sample<ShapeKind>(['dreieck', 'sechseck', 'kreis', 'achteck'], 3).map((s) => ({
    visual: shapeVisual(s, s === 'kreis' ? 0 : rotate),
    whyWrong: s === 'kreis' ? 'Ein Parallelogramm hat 4 Ecken. Diese Figur ist ganz rund.' : 'Ein Parallelogramm hat 4 Ecken. Tippe jede Ecke dieser Figur an.',
  }));
  const answer = pictureChoice(rng, shapeVisual('parallelogramm', rotate), wrong, 'Figur');
  const prompt = 'Welche Figur ist ein Parallelogramm?';
  return {
    key: `parallelogramm-finden:${rotate}`,
    prompt,
    answer,
    hints: ['Ein Parallelogramm hat 4 Ecken.', 'Die Ecken sind schief. Die gegenüber liegenden Seiten sind gleich lang.'],
    steps: ['Nur 1 Figur hat 4 schiefe Ecken.', `Das Parallelogramm ist ${correctLabel(answer)}.`],
    praise: 'Du hast auf Ecken und Seiten geachtet.',
    srText: `${prompt} ${zurWahl(answer)}`,
  };
};

const GROUPS = ['4 rechte Winkel', '4 Ecken, kein rechter Winkel', '3 Ecken', 'mehr als 4 Ecken', 'keine Ecken'] as const;
const GROUP_OF: Partial<Record<ShapeKind, (typeof GROUPS)[number]>> = {
  quadrat: '4 rechte Winkel', rechteck: '4 rechte Winkel', parallelogramm: '4 Ecken, kein rechter Winkel',
  dreieck: '3 Ecken', 'gleichseitiges-dreieck': '3 Ecken', sechseck: 'mehr als 4 Ecken', achteck: 'mehr als 4 Ecken', kreis: 'keine Ecken',
};

const sortIntoGroup: TaskFn = (c) => {
  const { rng } = c;
  const shape = rng.pick(Object.keys(GROUP_OF) as ShapeKind[]);
  const rotate = turnOf(c, shape);
  const group = GROUP_OF[shape]!;
  const answer = makeChoice(rng, { label: group }, GROUPS.filter((g) => g !== group).map((g) => ({ label: g, whyWrong: shape === 'kreis' ? 'Fahre am Rand entlang. Findest du eine Ecke?' : 'Tippe jede Ecke an. Prüfe die Ecken dann mit einer Papierecke.' })), { max: 5, order: [...GROUPS] });
  const prompt = 'In welche Gruppe gehört diese Figur?';
  return {
    key: `gruppe:${shape}:${rotate}`,
    prompt,
    // Named: the groups ask for properties, and the spoken text states them.
    visual: shapeVisual(shape, rotate, true),
    answer,
    hints: ['Zähle zuerst die Ecken der Figur.', 'Hat die Figur 4 Ecken? Dann prüfe die rechten Winkel.'],
    steps: [`Die Figur hat ${SHAPES[shape].beschreibung}.`, angleFact(shape).trim(), `Die Figur gehört zur Gruppe: ${group}.`].filter(Boolean),
    praise: 'Du hast die Figur nach ihrer Form sortiert.',
    srText: `Die Figur hat ${SHAPES[shape].beschreibung}.${angleFact(shape)}${turned(rotate)} ${prompt} ${zurWahl(answer)}`,
  };
};

const PROPERTIES: readonly { key: string; prompt: string; has: readonly ShapeKind[]; quadrate: boolean }[] = [
  { key: 'vier', prompt: 'Wie viele dieser Figuren haben 4 Ecken?', has: ['quadrat', 'rechteck'], quadrate: true },
  { key: 'drei', prompt: 'Wie viele dieser Figuren haben 3 Ecken?', has: ['dreieck'], quadrate: false },
  { key: 'winkel', prompt: 'Wie viele dieser Figuren haben rechte Winkel?', has: ['quadrat', 'rechteck'], quadrate: true },
  { key: 'rund', prompt: 'Wie viele dieser Figuren haben keine Ecke?', has: ['kreis'], quadrate: false },
];

const countByProperty: TaskFn = ({ rng }) => {
  const p = rng.pick(PROPERTIES);
  const shapes = Array.from({ length: rng.int(5, 6) }, () => rng.pick(ROW_SHAPES));
  shapes[rng.int(0, shapes.length - 1)] = rng.pick(p.has);
  const n = shapes.filter((s) => p.has.includes(s)).length;
  const squares = shapes.filter((s) => s === 'quadrat').length;
  const prompt = p.prompt;
  return {
    key: `eigenschaft:${p.key}:${shapes.join('-')}`,
    prompt,
    visual: { type: 'shapeRow', items: shapes.map((shape) => ({ shape })) },
    answer: { kind: 'number', value: n, before: 'Anzahl:' },
    bugs: numberBugs([
      { id: 'alle-figuren', match: shapes.length, hint: 'Prüfe jede Figur einzeln: Passt die Figur zur Frage?' },
      p.quadrate && squares > 0 && { id: 'nur-quadrate', match: squares, hint: 'Auch die länglichen Rechtecke passen zur Frage.' },
    ], n),
    hints: ['Geh von links nach rechts. Prüfe jede Figur einzeln.', 'Mach für jede passende Figur einen Strich.'],
    steps: [`Die Reihe: ${joinDe(shapes.map((s) => SHAPES[s].name))}.`, `Es zählen nur: ${joinDe(p.has.map((s) => SHAPES[s].name))}.`, plural(n, 'Das ist 1 Figur.', `Das sind ${n} Figuren.`)],
    praise: 'Du hast jede Figur einzeln geprüft.',
    srText: `Figuren in einer Reihe: ${joinDe(shapes.map((s) => SHAPES[s].name))}. ${prompt}`,
  };
};

const RIDDLES: readonly { name: string; clue: string }[] = [
  { name: 'Quadrat', clue: 'Ich habe 4 rechte Winkel. Alle Seiten sind gleich lang.' },
  { name: 'Rechteck', clue: 'Ich habe 4 rechte Winkel. Ich habe 2 lange und 2 kurze Seiten.' },
  { name: 'Parallelogramm', clue: 'Ich habe 4 Ecken, aber keinen rechten Winkel. Ich habe 2 lange und 2 kurze Seiten.' },
  { name: 'Kreis', clue: 'Ich bin ganz rund. Ich habe keine Ecken.' },
  { name: 'Dreieck', clue: 'Ich habe weniger Ecken als ein Quadrat. Ich habe gerade Seiten.' },
  { name: 'Sechseck', clue: 'Ich habe mehr Ecken als ein Rechteck. Ich habe weniger Ecken als ein Achteck.' },
];

const riddle: TaskFn = ({ rng }) => {
  const item = rng.pick(RIDDLES);
  const others = distractorNames(item.name, RIDDLES.map((r) => r.name));
  const answer = makeChoice(rng, { label: item.name }, rng.sample(others, 3).map((label) => ({ label, whyWrong: 'Prüfe jeden Satz an dieser Figur. Welcher Satz passt nicht?' })));
  const prompt = 'Wer bin ich?';
  return {
    key: `raetsel:${item.name}`,
    context: item.clue,
    prompt,
    answer,
    hints: ['Lies den ersten Satz. Welche Figuren passen?', 'Prüfe diese Figuren mit dem zweiten Satz.'],
    steps: ['Nur ein Name passt zu beiden Sätzen.', `Die Figur heißt ${item.name}.`],
    praise: 'Du hast beide Sätze an den Figuren geprüft.',
    srText: `${item.clue} ${prompt} ${zurWahl(answer)}`,
  };
};

const TABLE: TaskTable = {
  1: {
    1: [nameFigure, countCorners],
    2: [countCorners, turnedFigure, cornersTogether],
    3: [turnedFigure, rightAngles],
  },
  2: {
    1: [countCorners, turnedFigure, nameFigure],
    2: [rightAngles, findRightAngles, squareIsRect],
    3: [squareIsRect, countRectangles, findRightAngles],
  },
  3: {
    1: [rightAngles, nameParallelogram, findRightAngles],
    2: [nameParallelogram, parallelogramFacts, pickParallelogram, sortIntoGroup],
    3: [sortIntoGroup, countByProperty, riddle, countRectangles],
  },
};

export const figurenSkill = makeSkill({
  id: 'geometrie.figuren',
  title: 'Figuren und rechte Winkel',
  description: 'Du erkennst Figuren und ihre rechten Winkel.',
  stufen: { 1: 'Figuren benennen, auch gedreht; Ecken und Seiten zählen', 2: 'Rechte Winkel finden; das Quadrat ist auch ein Rechteck', 3: 'Parallelogramm; Figuren nach Eigenschaften sortieren' },
  kmk: ['RF.figuren'],
}, TABLE);
