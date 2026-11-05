/**
 * Säulen und Balken (docs/research.md §6).
 * Stufe 1: read a value, axis step 1 or 2. Stufe 2: step 5 or 10, difference and total, up to 100.
 * Stufe 3: Balken with step 50, up to 500, and a value between two marks. Bilddiagramme appear from step 2 on.
 */
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { bugList, build, makeChoice, targetAb } from '../shared';
import { BIG_THEMES, CARD_PX, cap, chart, distinctValues, maxChartLabel, pickCats, say, SMALL_THEMES, sum, themesWith, type Cat, type Theme } from './helpers';

const SKILL = { id: 'daten.diagramme', topicId: 'daten' } as const;
const KMK = ['DZ.daten'];

const HINT_ACHSE = 'Schau an die Achse: Wie viel ist es von Strich zu Strich?';
const HINT_LEGENDE = (iconValue: number) => `Schau in die Legende: Ein Bild steht für ${iconValue}.`;
const BUG_UNTERSCHIED = 'Gefragt ist der Unterschied: Wie viele sind es mehr?';
const BUG_PLUS = 'Hier geht es um den Unterschied. Rechne minus.';

interface Data {
  theme: Theme;
  cats: Cat[];
  values: number[];
  step: number;
  visual: Visual;
  /** Bilddiagramm: the value of one picture. */
  iconValue?: number;
  /** 'Säule' or 'Balken'. */
  bar: 'Säule' | 'Balken';
}

/** Data as a chart with this axis. Säulen get labels that fit a phone; maxTotal also limits the sum of all values. */
function chartData(rng: Rng, nCats: number, step: number, lo: number, hi: number, axisMax: number, big = false, maxTotal = Infinity): Data {
  const maxLabel = big ? Infinity : maxChartLabel(nCats, axisMax, CARD_PX);
  const theme = rng.pick(big ? BIG_THEMES : themesWith(SMALL_THEMES, nCats, maxLabel));
  const cats = pickCats(rng, theme, nCats, maxLabel);
  let values = distinctValues(rng, nCats, lo, hi, step);
  while (sum(values) > maxTotal) values = distinctValues(rng, nCats, lo, hi, step);
  return { theme, cats, values, step, visual: chart(theme, cats, values, axisMax, step, big), bar: big ? 'Balken' : 'Säule' };
}

/** Data as a Bilddiagramm: every value is a whole number of pictures, at least 2 (the legend shows the value of 1). */
function pictoData(rng: Rng, nCats: number, iconValue: number, maxPictures: number, big = false): Data {
  const theme = rng.pick(big ? BIG_THEMES : SMALL_THEMES);
  const cats = pickCats(rng, theme, nCats);
  const values = distinctValues(rng, nCats, 2, maxPictures).map((n) => n * iconValue);
  return {
    theme, cats, values, step: iconValue, iconValue, bar: 'Säule',
    visual: { type: 'pictogram', title: theme.title, categories: cats.map((c) => c.label), values, iconValue, icon: theme.icon },
  };
}

/** A worked line for the value of a category. */
function readLine(d: Data, i: number): string {
  if (d.iconValue) return `${d.cats[i].label}: ${d.values[i] / d.iconValue} Bilder, jedes zählt ${d.iconValue}. Das sind ${d.values[i]}.`;
  return `${d.cats[i].label}: ${d.bar === 'Säule' ? 'Die Säule geht' : 'Der Balken geht'} bis ${d.values[i]}.`;
}

/** The misreading of this display: marks or pictures counted as the value itself. */
function scaleBugs(d: Data, value: number): [string, number | null, string][] {
  if (d.iconValue) return [['bild-legende', value / d.iconValue, HINT_LEGENDE(d.iconValue)]];
  return d.step === 1 ? [] : [['achse-schritt', value / d.step, HINT_ACHSE]];
}

const keyOf = (form: string, d: Data, ...more: (string | number)[]) => [form, d.theme.id, d.step, d.iconValue ? 'bild' : 'saeule', d.values.join('-'), ...more].join(':');

const scaleHint = (d: Data) => (d.iconValue ? HINT_LEGENDE(d.iconValue) : HINT_ACHSE);
const scaleStep = (d: Data) => (d.iconValue ? `Ein Bild zählt ${d.iconValue}.` : `Von Strich zu Strich ${d.step === 1 ? 'ist' : 'sind'} es ${d.step}.`);

// ─── Task forms ──────────────────────────────────────────────────────────────

function readValue(rng: Rng, stufe: Stufe, ab: Ab, d: Data): Exercise {
  const i = rng.int(0, d.cats.length - 1);
  const value = d.values[i];
  const prompt = d.theme.ask(d.cats[i]);
  return build(SKILL, stufe, {
    key: keyOf('lesen', d, d.cats[i].label),
    ab,
    prompt,
    visual: d.visual,
    answer: { kind: 'number', value, unit: d.theme.unit, label: 'Anzahl' },
    hints: [scaleHint(d), d.iconValue ? `Such die Zeile ${d.cats[i].label}.` : `Such ${d.cats[i].label} und lies an der Achse ab.`],
    steps: [scaleStep(d), readLine(d, i)],
    bugs: bugList(value, [...scaleBugs(d, value), ['andere-zeile', d.values[(i + 1) % d.values.length], `Das ist ein anderer Wert. Such ${d.cats[i].label}.`]]),
    praise: d.iconValue ? 'Du hast die Legende beim Ablesen benutzt.' : 'Du hast den Schritt an der Achse beachtet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function tallest(rng: Rng, stufe: Stufe, ab: Ab, d: Data): Exercise {
  const longest = d.bar === 'Balken';
  const large = rng.chance(0.6);
  const target = d.values.indexOf(large ? Math.max(...d.values) : Math.min(...d.values));
  const prompt = longest ? `Welcher Balken ist am ${large ? 'längsten' : 'kürzesten'}?` : `Welche Säule ist am ${large ? 'höchsten' : 'niedrigsten'}?`;
  return build(SKILL, stufe, {
    key: keyOf(large ? 'groesste' : 'kleinste', d),
    ab,
    prompt,
    visual: d.visual,
    answer: makeChoice(rng, { label: d.cats[target].label }, d.cats.flatMap((c, i) => (i === target ? [] : [{ label: c.label, whyWrong: 'Vergleiche die Enden an der Achse.' }]))),
    hints: ['Vergleiche die Enden der Säulen oder Balken.', 'Schau zuerst auf die Enden.'],
    steps: [`Die Werte sind ${d.values.join(', ')}.`, `${cap(d.cats[target].at)} ist der Wert am ${large ? 'größten' : 'kleinsten'}.`],
    praise: 'Du hast die Enden miteinander verglichen.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function differenceOf(rng: Rng, stufe: Stufe, ab: Ab, d: Data): Exercise {
  const [p, q] = rng.sample(d.cats.map((_, i) => i), 2);
  const [hi, lo] = d.values[p] > d.values[q] ? [p, q] : [q, p];
  const diff = d.values[hi] - d.values[lo];
  const prompt = `Wie viele ${d.theme.unit} sind es ${d.cats[hi].at} mehr als ${d.cats[lo].at}?`;
  return build(SKILL, stufe, {
    key: keyOf('mehr', d, d.cats[hi].label, d.cats[lo].label),
    ab,
    prompt,
    visual: d.visual,
    answer: { kind: 'number', value: diff, unit: d.theme.unit, label: 'Unterschied' },
    hints: [scaleHint(d), 'Lies beide Werte ab. Rechne dann minus.'],
    steps: [readLine(d, hi), readLine(d, lo), `${d.values[hi]} − ${d.values[lo]} = ${diff}`],
    bugs: bugList(diff, [['mehr-unterschied', d.values[hi], BUG_UNTERSCHIED], ['plus-statt-minus', d.values[hi] + d.values[lo], BUG_PLUS], ...scaleBugs(d, diff)]),
    praise: 'Du hast beide Werte abgelesen und den Unterschied gerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function totalOf(stufe: Stufe, ab: Ab, d: Data): Exercise {
  const total = sum(d.values);
  const prompt = `Wie viele ${d.theme.unit} sind es insgesamt?`;
  return build(SKILL, stufe, {
    key: keyOf('insgesamt', d),
    ab,
    prompt,
    visual: d.visual,
    answer: { kind: 'number', value: total, unit: d.theme.unit, label: 'Anzahl' },
    hints: [scaleHint(d), 'Lies jeden Wert ab. Rechne dann alle Werte plus.'],
    steps: [scaleStep(d), `Die Werte sind ${d.values.join(', ')}.`, `${d.values.join(' + ')} = ${total}`],
    bugs: bugList(total, [['wert-vergessen', total - d.values[d.values.length - 1], 'Prüfe: Hast du jeden Wert mitgerechnet?'], ...scaleBugs(d, total)]),
    praise: 'Du hast jeden Wert mitgerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 3: one Balken ends halfway between two marks. */
function betweenMarks(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const d = chartData(rng, rng.int(3, 4), 50, 50, 450, 500, true);
  const i = rng.int(0, d.cats.length - 1);
  const lower = d.values[i];
  const value = lower + 25;
  const values = d.values.map((v, k) => (k === i ? value : v));
  const data: Data = { ...d, values, visual: chart(d.theme, d.cats, values, 500, 50, true) };
  const context = 'Der Balken endet mitten zwischen 2 Strichen.';
  const prompt = d.theme.ask(d.cats[i]);
  return build(SKILL, stufe, {
    key: keyOf('zwischen', data, d.cats[i].label),
    ab,
    context,
    prompt,
    visual: data.visual,
    answer: { kind: 'number', value, unit: d.theme.unit, label: 'Anzahl' },
    hints: ['Lies die Zahlen an den beiden Strichen ab.', 'Von Strich zu Strich sind es 50. Wie viel ist die Hälfte davon?'],
    steps: [`Der Balken endet zwischen ${lower} und ${lower + 50}.`, 'Die Hälfte von 50 ist 25.', `${lower} + 25 = ${value}`],
    bugs: bugList(value, [
      ['zwischen-unten', lower, 'Der Balken geht über diesen Strich hinaus. Wo genau endet der Balken?'],
      ['zwischen-oben', lower + 50, 'So weit reicht der Balken nicht. Wo genau endet der Balken?'],
    ]),
    praise: 'Du hast die Mitte zwischen 2 Strichen gefunden.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

// ─── Stufen ──────────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  if (ab === 1) {
    // Values start at 2: the answer stands next to a plural unit, and '1 Kinder' would need the singular.
    const d = chartData(rng, n, 1, 2, 10, 10);
    return rng.chance(0.2) ? tallest(rng, 1, ab, d) : readValue(rng, 1, ab, d);
  }
  if (ab === 2) return readValue(rng, 1, ab, rng.chance(0.3) ? pictoData(rng, n, 2, 8) : chartData(rng, n, 2, 2, 20, 20));
  return differenceOf(rng, 1, ab, rng.chance(0.3) ? pictoData(rng, n, 2, 8) : chartData(rng, n, 2, 2, 20, 20));
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const axis = () => (rng.chance(0.5) ? chartData(rng, n, 5, 5, 50, 50) : chartData(rng, n, 10, 10, 100, 100));
  if (ab === 1) {
    const d = axis();
    return rng.chance(0.2) ? tallest(rng, 2, ab, d) : readValue(rng, 2, ab, d);
  }
  if (ab === 2) {
    if (rng.chance(0.3)) return readValue(rng, 2, ab, pictoData(rng, n, rng.pick([5, 10]), 8));
    return differenceOf(rng, 2, ab, axis());
  }
  // Three values, so the total stays at most 100: 35 + 30 + 25 and 40 + 30 + 20.
  return totalOf(2, ab, rng.chance(0.5) ? chartData(rng, 3, 5, 5, 35, 50) : chartData(rng, 3, 10, 10, 40, 100));
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const balken = () => chartData(rng, n, 50, 50, 500, 500, true);
  if (ab === 1) {
    const d = balken();
    return rng.chance(0.2) ? tallest(rng, 3, ab, d) : readValue(rng, 3, ab, d);
  }
  if (ab === 2) {
    if (rng.chance(0.3)) return readValue(rng, 3, ab, pictoData(rng, n, 50, 8, true));
    return differenceOf(rng, 3, ab, balken());
  }
  // The catalogue limit of 500 also holds for the total, not only for the axis.
  return rng.chance(0.75) ? betweenMarks(rng, 3, ab) : totalOf(3, ab, chartData(rng, 3, 50, 50, 350, 500, true, 500));
}

export const diagrammeSkill: SkillDef = {
  ...SKILL,
  title: 'Säulen und Balken',
  description: 'Du liest Diagramme ab und vergleichst.',
  stufen: { 1: 'Ablesen, von Strich zu Strich 1 oder 2', 2: 'Von Strich zu Strich 5 oder 10, Unterschied und insgesamt', 3: 'Balken bis 500, Werte zwischen den Strichen' },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
