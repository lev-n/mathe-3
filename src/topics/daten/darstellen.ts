/**
 * Strichliste, Tabelle, Diagramm (docs/research.md §6).
 * Stufe 1: Strichliste to table, up to 50. Stufe 2: table to the fitting Säulendiagramm, up to 50.
 * Stufe 3: find the value that someone copied wrongly.
 */
import type { Ab, Exercise, MultiField, Rng, SkillDef, Step, Stufe, Visual, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, pickPerson, targetAb } from '../shared';
import { CARD_PX, cap, chart, distinctValues, fixedChoice, maxChartLabel, oneColumnTable, OPTION_PX, pictureChoice, pickCats, say, SMALL_THEMES, tally, themesWith, type Cat, type Theme } from './helpers';

const SKILL = { id: 'daten.darstellen', topicId: 'daten' } as const;
const KMK = ['DZ.daten', 'PK.darstellen'];

const HINT_BUENDEL = 'Ein Bündel hat 5 Striche. Rechne immer plus 5.';
const HINT_REST = 'Zähle die einzelnen Striche am Ende dazu.';
const HINT_ACHSE = 'Schau an die Achse: Wie viel ist es von Strich zu Strich?';
/** A table as an answer option fits an option on a phone with labels up to this length. */
const OPTION_TABLE_LABEL = 8;

/** A bundle read as 4 strokes (only the upright ones). */
const bundleAsFour = (n: number) => n - Math.floor(n / 5);
/** A bundle read as 1 thing. */
const bundleAsOne = (n: number) => Math.floor(n / 5) + (n % 5);

/** One worked line of a tally row. */
function tallyStep(label: string, n: number): string {
  const b = Math.floor(n / 5);
  const r = n % 5;
  if (b === 0) return `${label}: ${r} ${r === 1 ? 'Strich' : 'Striche'}.`;
  if (r === 0) return `${label}: ${b} ${b === 1 ? 'Bündel ist' : 'Bündel sind'} ${n}.`;
  return `${label}: ${b} ${b === 1 ? 'Bündel ist' : 'Bündel sind'} ${b * 5}, dazu ${r}. Das sind ${n}.`;
}

function fieldsOf(cats: readonly Cat[], values: readonly number[]): MultiField[] {
  return cats.map((c, i) => ({ id: `z${i}`, value: values[i], before: `${c.label}:`, label: c.label }));
}

const matchAll = (values: readonly number[], f: (n: number) => number) => Object.fromEntries(values.map((v, i) => [`z${i}`, f(v)]));

const keyOf = (form: string, theme: Theme, values: readonly number[], ...more: (string | number)[]) => [form, theme.id, values.join('-'), ...more].join(':');

// ─── Stufe 1: Strichliste to table ───────────────────────────────────────────

function tallyToTable(rng: Rng, stufe: Stufe, ab: Ab, nRows: number, hi: number): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, nRows);
  const values = distinctValues(rng, nRows, 3, hi);
  const fields = fieldsOf(cats, values);
  const prompt = 'Lies die Strichliste. Schreib die Zahlen in die Tabelle.';
  return build(SKILL, stufe, {
    key: keyOf('liste', theme, values, cats.map((c) => c.label).join('-')),
    ab,
    prompt,
    visual: tally(theme, cats, values),
    answer: { kind: 'multi', fields },
    hints: [HINT_BUENDEL, HINT_REST],
    steps: cats.map((c, i) => tallyStep(c.label, values[i])),
    bugs: multiBugs([
      { id: 'buendel-als-vier', match: matchAll(values, bundleAsFour), hint: 'Schau auf den Querstrich: Ein Bündel hat 4 gerade und 1 schrägen Strich.' },
      { id: 'buendel-als-eins', match: matchAll(values, bundleAsOne), hint: 'Ein Bündel zählt nicht 1. Ein Bündel hat 5 Striche.' },
    ], fields),
    praise: 'Du hast jedes Bündel als 5 gerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function whichTable(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(themesWith(SMALL_THEMES, 3, OPTION_TABLE_LABEL));
  const cats = pickCats(rng, theme, 3, OPTION_TABLE_LABEL);
  const values = distinctValues(rng, 3, 6, 30);
  const swapped = [values[1], values[0], values[2]];
  const prompt = 'Welche Tabelle passt zur Strichliste?';
  const correct = oneColumnTable(theme, cats, values);
  return build(SKILL, stufe, {
    key: keyOf('welche-tabelle', theme, values, cats.map((c) => c.label).join('-')),
    ab,
    prompt,
    visual: tally(theme, cats, values),
    answer: pictureChoice(rng, 'Tabelle', correct, [
      { visual: oneColumnTable(theme, cats, values.map(bundleAsFour)), whyWrong: 'Hier zählt jedes Bündel nur 4. Ein Bündel hat 5 Striche.' },
      { visual: oneColumnTable(theme, cats, swapped), whyWrong: 'Hier sind 2 Zahlen vertauscht. Prüfe jede Zeile.' },
    ], 3),
    hints: [HINT_BUENDEL, 'Prüfe jede Zeile: Passt die Zahl zu den Strichen?'],
    steps: [tallyStep(cats[0].label, values[0]), tallyStep(cats[1].label, values[1]), { text: tallyStep(cats[2].label, values[2]), visual: correct }],
    praise: 'Du hast jede Zeile mit den Strichen verglichen.',
    srText: say(prompt),
    kmk: KMK,
  });
}

// ─── Stufe 2: table and Säulendiagramm ───────────────────────────────────────

/** Axis of a chart up to 50: step and largest value. */
function pickAxis(rng: Rng): { step: number; max: number } {
  return rng.pick([{ step: 2, max: 20 }, { step: 5, max: 50 }, { step: 10, max: 50 }]);
}

function chartToTable(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, 3);
  const { step, max } = pickAxis(rng);
  const values = distinctValues(rng, 3, step, max, step);
  const fields = fieldsOf(cats, values);
  const prompt = 'Lies das Diagramm ab. Schreib die Zahlen in die Tabelle.';
  return build(SKILL, stufe, {
    key: keyOf('diagramm-tabelle', theme, values, step, cats.map((c) => c.label).join('-')),
    ab,
    prompt,
    visual: chart(theme, cats, values, max, step),
    answer: { kind: 'multi', fields },
    hints: [HINT_ACHSE, 'Geh vom Ende der Säule waagerecht zur Achse.'],
    steps: [`Von Strich zu Strich sind es ${step}.`, ...cats.map((c, i) => `${c.label}: Die Säule geht bis ${values[i]}.`)],
    bugs: multiBugs([{ id: 'achse-schritt', match: matchAll(values, (v) => v / step), hint: HINT_ACHSE }], fields),
    praise: 'Du hast zuerst den Schritt an der Achse geprüft.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function tableToChart(rng: Rng, stufe: Stufe, ab: Ab, max: number): Exercise {
  const n = max === 3 ? 3 : rng.pick([3, 4]);
  const { step, max: axisMax } = rng.pick([{ step: 5, max: 50 }, { step: 10, max: 50 }]);
  // The charts are the options: all columns stay in view, so the options can be compared without scrolling.
  const maxLabel = maxChartLabel(n, axisMax, OPTION_PX);
  const theme = rng.pick(themesWith(SMALL_THEMES, n, maxLabel));
  const cats = pickCats(rng, theme, n, maxLabel);
  const values = distinctValues(rng, n, step, axisMax - step, step);
  const swapped = [values[1], values[0], ...values.slice(2)];
  const i = rng.int(0, n - 1);
  const shifted = values.map((v, k) => (k === i ? v + step : v));
  const correct = chart(theme, cats, values, axisMax, step);
  const prompt = 'Welches Diagramm passt zur Tabelle?';
  const wrongs: { visual: Visual; whyWrong: string }[] = [
    { visual: chart(theme, cats, swapped, axisMax, step), whyWrong: 'Hier sind 2 Säulen vertauscht. Schau auf die Namen unter den Säulen.' },
    { visual: chart(theme, cats, shifted, axisMax, step), whyWrong: 'Eine Säule ist zu hoch. Prüfe jede Säule an der Achse.' },
    { visual: chart(theme, cats, values.map((v) => v / step), axisMax, step), whyWrong: HINT_ACHSE },
  ];
  return build(SKILL, stufe, {
    key: keyOf('tabelle-diagramm', theme, values, step, cats.map((c) => c.label).join('-')),
    ab,
    prompt,
    visual: oneColumnTable(theme, cats, values),
    answer: pictureChoice(rng, 'Diagramm', correct, wrongs, max),
    hints: [HINT_ACHSE, 'Prüfe jede Säule: Passt die Höhe zur Zahl in der Tabelle?'],
    steps: [`Von Strich zu Strich sind es ${step}.`, `${cap(cats[0].at)} steht ${values[0]}, also geht die Säule bis ${values[0]}.`, { text: 'Prüfe so jede Säule. Dieses Diagramm passt.', visual: correct }],
    praise: 'Du hast jede Säule mit der Tabelle verglichen.',
    srText: say(prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3: the wrongly copied value ───────────────────────────────────────

/** A plausible copying slip: a bundle read as 4, one stroke more or less, one bundle more. */
function slip(rng: Rng, n: number): number {
  const candidates = [bundleAsFour(n), n + 1, n - 1, n + 5].filter((x) => x !== n && x >= 1 && x <= 50);
  return rng.pick(candidates);
}

function copyCheck(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, 3);
  const values = distinctValues(rng, 3, 6, 40);
  const i = rng.int(0, 2);
  const fits = rng.chance(0.5);
  const shown = fits ? values[i] : slip(rng, values[i]);
  const name = pickPerson(rng).name;
  const context = `${name} schreibt ${cats[i].at} die Zahl ${shown}.`;
  const prompt = 'Passt das zur Strichliste?';
  const yes = { label: 'Ja, das passt.', whyWrong: 'Rechne die Bündel und Striche in dieser Zeile aus. Vergleiche dann.' };
  const no = { label: 'Nein, das passt nicht.', whyWrong: 'Rechne die Bündel und Striche in dieser Zeile aus. Vergleiche dann.' };
  return build(SKILL, stufe, {
    key: keyOf('stimmt', theme, values, cats[i].label, shown),
    ab,
    context,
    prompt,
    visual: tally(theme, cats, values),
    answer: fixedChoice([yes, no], fits ? 0 : 1),
    hints: [`Such die Zeile ${cats[i].label} in der Strichliste.`, HINT_BUENDEL],
    steps: [tallyStep(cats[i].label, values[i]), fits ? `${name} schreibt ${shown}. Das passt.` : `${name} schreibt ${shown}. Das passt nicht.`],
    praise: 'Du hast die Zahl mit den Strichen verglichen.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** The source (Strichliste or Diagramm) and the rows someone copied: one row does not fit. */
function findWrongRow(rng: Rng, stufe: Stufe, ab: Ab, source: 'tally' | 'chart'): Exercise {
  const n = rng.int(3, 4);
  const { step, max } = rng.pick([{ step: 5, max: 50 }, { step: 10, max: 50 }]);
  const maxLabel = source === 'chart' ? maxChartLabel(n, max, CARD_PX) : Infinity;
  const theme = rng.pick(themesWith(SMALL_THEMES, n, maxLabel));
  const cats = pickCats(rng, theme, n, maxLabel);
  const values = source === 'tally' ? distinctValues(rng, n, 6, 40) : distinctValues(rng, n, step, max - step, step);
  const i = rng.int(0, n - 1);
  const shown = source === 'tally' ? slip(rng, values[i]) : rng.pick([values[i] + step, values[i] + 1, values[i] - 1]);
  const name = pickPerson(rng).name;
  const visual: Visual = source === 'tally' ? tally(theme, cats, values) : chart(theme, cats, values, max, step);
  const noun = source === 'tally' ? 'Strichliste' : 'Diagramm';
  const article = source === 'tally' ? 'die' : 'das';
  const context = `${name} schreibt ${article} ${noun} in eine Tabelle ab.`;
  const prompt = 'Welche Zeile passt nicht?';
  const steps: Step[] = source === 'tally' ? [tallyStep(cats[i].label, values[i])] : [`Von Strich zu Strich sind es ${step}.`, `${cats[i].label}: Die Säule geht bis ${values[i]}.`];
  return build(SKILL, stufe, {
    key: keyOf(`zeile-${source}`, theme, values, cats[i].label, shown),
    ab,
    context,
    prompt,
    visual,
    answer: makeChoice(rng, { label: `${cats[i].label}: ${shown}` }, cats.flatMap((c, k) => (k === i ? [] : [{ label: `${c.label}: ${values[k]}`, whyWrong: 'Diese Zeile passt. Prüfe die nächste Zeile.' }])), { max: 4 }),
    hints: [`Prüfe jede Zeile am ${noun === 'Strichliste' ? 'Bild' : 'Diagramm'}.`, source === 'tally' ? HINT_BUENDEL : HINT_ACHSE],
    steps: [...steps, `${name} schreibt ${shown}. Diese Zeile passt nicht.`],
    praise: 'Du hast jede Zeile einzeln geprüft.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

function rightValue(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, 3);
  const { step, max } = rng.pick([{ step: 5, max: 50 }, { step: 10, max: 50 }]);
  const values = distinctValues(rng, 3, step, max - step, step);
  const i = rng.int(0, 2);
  const shown = values[i] + step;
  const name = pickPerson(rng).name;
  const visual: VisualOf<'barChart'> = chart(theme, cats, values, max, step);
  const context = `${name} schreibt ${cats[i].at} die Zahl ${shown}. Das passt nicht.`;
  const prompt = 'Welche Zahl zeigt das Diagramm?';
  const value = values[i];
  return build(SKILL, stufe, {
    key: keyOf('richtige-zahl', theme, values, cats[i].label, step),
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value, label: 'Richtige Zahl' },
    hints: [`Such die Säule ${cats[i].label}.`, HINT_ACHSE],
    steps: [`Von Strich zu Strich sind es ${step}.`, `${cats[i].label}: Die Säule geht bis ${value}.`, `In die Tabelle gehört ${value}.`],
    bugs: [
      { id: 'abgeschrieben', match: shown, hint: `Das ist die Zahl von ${name}. Schau selbst in das Diagramm.` },
      ...(value / step !== shown ? [{ id: 'achse-schritt', match: value / step, hint: HINT_ACHSE }] : []),
    ],
    praise: 'Du hast selbst im Diagramm nachgeschaut.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

export const darstellenSkill: SkillDef = {
  ...SKILL,
  title: 'Strichliste, Tabelle, Diagramm',
  description: 'Du überträgst Daten von einer Darstellung in die andere.',
  stufen: { 1: 'Von der Strichliste in die Tabelle', 2: 'Von der Tabelle zum passenden Diagramm', 3: 'Die unpassende Zahl finden' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return tallyToTable(rng, stufe, ab, rng.int(2, 3), 20);
      return ab === 2 ? whichTable(rng, stufe, ab) : tallyToTable(rng, stufe, ab, 4, 50);
    }
    if (stufe === 2) return ab === 1 ? chartToTable(rng, stufe, ab) : tableToChart(rng, stufe, ab, ab === 2 ? 3 : 4);
    if (ab === 1) return copyCheck(rng, stufe, ab);
    if (ab === 2) return findWrongRow(rng, stufe, ab, 'tally');
    return rng.chance(0.5) ? findWrongRow(rng, stufe, ab, 'chart') : rightValue(rng, stufe, ab);
  },
};
