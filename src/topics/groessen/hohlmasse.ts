/**
 * Liter und Milliliter (docs/research.md §6), optional: no source read fixes it for Klasse 3.
 * AB I: choose l or ml, read a Messbecher.
 * AB II: 1 l = 1000 ml, ½ l = 500 ml.
 * AB III: ¼ l and ¾ l, pour into 250 ml cups.
 */
import { BOX, NBSP, fmtMixed } from '../../core/format';
import type { ChoiceOption, SkillDef } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickPerson, plural } from '../shared';
import { fromLabel, generator, qty, sr, unitChoiceSr, type Form } from './helpers';

const SKILL = { id: 'groessen.hohlmasse', topicId: 'groessen' } as const;
const KMK = ['GM.hohlmasse', 'GM.einheiten'];

const HINT_L = '1 l sind 1000 ml.';
const HINT_STRICH = 'Schau: Wie viel Milliliter ist ein Strich?';

const mixedMl = (ml: number) => fmtMixed(ml, 1000, 'l', 'ml');

interface Gefaess {
  text: string;
  value: number;
  unit: 'l' | 'ml';
}

const GEFAESSE: readonly Gefaess[] = [
  { text: 'In eine Tasse passen', value: 200, unit: 'ml' },
  { text: 'In ein Trinkglas passen', value: 250, unit: 'ml' },
  { text: 'In einen Joghurtbecher passen', value: 150, unit: 'ml' },
  { text: 'In einen Eierbecher passen', value: 50, unit: 'ml' },
  { text: 'In eine kleine Saftpackung passen', value: 200, unit: 'ml' },
  { text: 'In einen Eimer passen', value: 10, unit: 'l' },
  { text: 'In eine Badewanne passen', value: 150, unit: 'l' },
  { text: 'In eine Gießkanne passen', value: 5, unit: 'l' },
  { text: 'In ein Aquarium passen', value: 50, unit: 'l' },
  { text: 'In einen Kochtopf passen', value: 3, unit: 'l' },
];

const einheitWaehlen: Form = (rng, _stufe, ab) => {
  const g = rng.pick(GEFAESSE);
  const other = g.unit === 'l' ? 'ml' : 'l';
  const prompt = `${g.text} ${g.value} ${BOX}. Welche Einheit passt?`;
  const wrong: ChoiceOption = {
    label: other,
    whyWrong: other === 'l' ? `${qty(g.value, 'l')} sind sehr viel. Eine große Flasche Saft hat 1 l.` : `${qty(g.value, 'ml')} sind nur ganz wenig. Ein Löffel hat etwa 10 ml.`,
  };
  const answer = makeChoice(rng, { label: g.unit }, [wrong], { layout: 'symbols' });
  return {
    key: `einheit:${g.text}`,
    ab,
    prompt,
    answer,
    hints: ['Eine große Flasche Saft hat 1 l.', 'Ein Löffel hat etwa 10 ml.'],
    steps: ['Eine große Flasche Saft hat 1 l. Ein Löffel hat etwa 10 ml.', `${g.text} ${qty(g.value, g.unit)}.`],
    praise: 'Du hast das Gefäß mit Flasche und Löffel verglichen.',
    srText: sr(prompt, unitChoiceSr(answer)),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

/** Labelled every 100 ml, as the Messbecher up to 1000 ml draws it (labelEvery in src/ui/visuals/ContainerVisual.tsx). */
const LABEL_ML = 100;

/** The surface from the labelled number below it, as in the aria-label of the Messbecher. */
function fuellText(step: number, ml: number): string {
  const { last, ticks } = fromLabel(ml, LABEL_ML, step);
  if (ticks === 0) return `Die Flüssigkeit reicht genau bis zur Zahl ${ml}.`;
  return `Die Flüssigkeit reicht ${ticks} ${plural(ticks, 'Strich', 'Striche')} über ${last === 0 ? 'den Boden' : `die Zahl ${last}`}.`;
}

const FLUESSIG = ['Wasser', 'Saft', 'Milch', 'Tee'];

const messbecher: Form = (rng, stufe, ab) => {
  const step = stufe === 1 ? 100 : rng.pick([100, 50]);
  const ml = rng.int(1, 1000 / step - 1) * step;
  const marks = ml / step;
  const { last, ticks } = fromLabel(ml, LABEL_ML, step);
  const what = rng.pick(FLUESSIG);
  const prompt = `Lies den Messbecher ab. Wie viel ${what} ist im Becher?`;
  return {
    key: `becher:${step}:${ml}`,
    ab,
    prompt,
    visual: { type: 'container', capacityMl: 1000, fillMl: ml, stepMl: step },
    answer: { kind: 'number', value: ml, unit: 'ml', label: 'Menge in Milliliter' },
    hints: [HINT_STRICH, 'Lies die Zahl unter der Oberfläche. Geh dann Strich für Strich weiter.'],
    steps: [`Ein Strich sind ${qty(step, 'ml')}.`, fuellText(step, ml), ticks > 0 && last > 0 ? `${qty(last, 'ml')} + ${qty(ticks * step, 'ml')} = ${qty(ml, 'ml')}` : `Das sind ${qty(ml, 'ml')}.`],
    bugs: numberBugs([{ id: 'skala-schritt', match: marks * 10, hint: HINT_STRICH }, { id: 'skala-schritt', match: marks, hint: HINT_STRICH }], ml),
    praise: 'Du hast zuerst den Schritt von Strich zu Strich gelesen.',
    srText: sr(prompt, `Messbecher bis ${qty(1000, 'ml')}. Ein Strich bedeutet ${qty(step, 'ml')}. ${fuellText(step, ml)}`),
    kmk: KMK,
  };
};

const lZuMl: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 9);
  const value = n * 1000;
  const prompt = 'Schreibe in Milliliter.';
  const expression = `${qty(n, 'l')} = ${BOX}${NBSP}ml`;
  return {
    key: `l:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'ml', label: 'Menge in Milliliter' },
    hints: n === 1 ? ['Denk an eine große Flasche Saft.', 'Nimm 10-mal 100 ml.'] : [HINT_L, `Nimm ${n}-mal 1000 ml.`],
    steps: [n === 1 ? `10 · 100 ml = ${qty(value, 'ml')}` : `${qty(n, 'l')} = ${n} · 1000 ml = ${qty(value, 'ml')}`],
    bugs: numberBugs([{ id: 'liter-100', match: n * 100, hint: n === 1 ? 'Nimm 10-mal 100 ml.' : HINT_L }], value),
    praise: 'Du hast an 1000 ml pro Liter gedacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const lMlZuMl: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 5);
  const ml = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 3) * 250, rng.int(1, 9) * 50]);
  const value = n * 1000 + ml;
  const prompt = 'Schreibe in Milliliter.';
  const expression = `${mixedMl(value)} = ${BOX}${NBSP}ml`;
  return {
    key: `lml:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'ml', label: 'Menge in Milliliter' },
    hints: [HINT_L, 'Rechne zuerst die Liter um. Dann kommen die Milliliter dazu.'],
    steps: [`${qty(n, 'l')} = ${qty(n * 1000, 'ml')}`, `${qty(n * 1000, 'ml')} + ${qty(ml, 'ml')} = ${qty(value, 'ml')}`],
    bugs: numberBugs([{ id: 'liter-100', match: n * 100 + ml, hint: HINT_L }, { id: 'einheit-gemischt', match: n + ml, hint: 'Rechne zuerst alles in Milliliter um.' }], value),
    praise: 'Du hast die Liter zuerst in Milliliter umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mlZuL: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 5);
  const ml = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 50]);
  const value = n * 1000 + ml;
  const fields = [{ id: 'l', value: n, after: 'l', label: 'Liter' }, { id: 'ml', value: ml, after: 'ml', label: 'Milliliter' }];
  const prompt = 'Schreibe in Liter und Milliliter.';
  const expression = `${qty(value, 'ml')} = ${BOX}${NBSP}l ${BOX}${NBSP}ml`;
  return {
    key: `mll:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [HINT_L, 'Die Tausender sind die Liter. Der Rest bleibt in Milliliter.'],
    steps: [`${qty(n * 1000, 'ml')} = ${qty(n, 'l')}`, `Es bleiben ${qty(ml, 'ml')}.`, `${qty(value, 'ml')} = ${mixedMl(value)}`],
    bugs: multiBugs([{ id: 'liter-100', match: { l: Math.floor(value / 100), ml: value % 100 }, hint: HINT_L }], fields),
    praise: 'Du hast aus 1000 ml einen Liter gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const halberLiter: Form = (rng, _stufe, ab) => {
  const plus = rng.pick([0, 0, 100, 200, 300, 400]);
  const value = 500 + plus;
  const prompt = plus ? 'Rechne in Milliliter.' : 'Schreibe in Milliliter.';
  const left = plus ? `½${NBSP}l + ${qty(plus, 'ml')}` : `½${NBSP}l`;
  const expression = `${left} = ${BOX}${NBSP}ml`;
  const hint = 'Nimm die Hälfte von 1000 ml.';
  return {
    key: `halb:${plus}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'ml', label: 'Menge in Milliliter' },
    hints: [HINT_L, hint],
    steps: [`Die Hälfte von 1 l: 1000 ml : 2 = ${qty(500, 'ml')}`, ...(plus ? [`${qty(500, 'ml')} + ${qty(plus, 'ml')} = ${qty(value, 'ml')}`] : [])],
    bugs: numberBugs([{ id: 'liter-halb', match: 50 + plus, hint }], value),
    praise: 'Du hast die Hälfte von 1000 ml genommen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const viertel: Form = (rng, _stufe, ab) => {
  const quarters = rng.pick([1, 3]);
  const n = rng.int(0, 3);
  const part = quarters * 250;
  const value = n * 1000 + part;
  const sign = quarters === 1 ? '¼' : '¾';
  const left = n ? `${qty(n, 'l')} + ${sign}${NBSP}l` : `${sign}${NBSP}l`;
  const prompt = n ? 'Rechne in Milliliter.' : 'Schreibe in Milliliter.';
  const expression = `${left} = ${BOX}${NBSP}ml`;
  const hint = 'Teile 1000 ml in 4 gleiche Teile.';
  return {
    key: `viertel:${quarters}:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'ml', label: 'Menge in Milliliter' },
    hints: [HINT_L, hint],
    steps: [
      `1000 ml : 2 = ${qty(500, 'ml')}`,
      `500 ml : 2 = ${qty(250, 'ml')}`,
      ...(quarters === 3 ? [`3 · 250 ml = ${qty(750, 'ml')}`] : []),
      ...(n ? [`${qty(n * 1000, 'ml')} + ${qty(part, 'ml')} = ${qty(value, 'ml')}`] : [`${sign}${NBSP}l = ${qty(value, 'ml')}`]),
    ],
    bugs: numberBugs([{ id: 'liter-25', match: n * 1000 + (quarters === 1 ? 25 : 75), hint }], value),
    praise: 'Du hast den Liter in 4 gleiche Teile geteilt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

/** The way to the number of cups: 4 cups make 1 l, then the rest cup by cup. */
function becherSteps(ml: number): string[] {
  const liter = Math.floor(ml / 1000);
  const rest = ml % 1000;
  const fromLiter = liter * 4;
  const fromRest = rest / 250;
  return [
    ...(liter > 0 ? [`4 · 250 ml = ${qty(1000, 'ml')}: In 1 l passen 4 Becher.`] : []),
    ...(liter > 1 ? [`${liter} · 4 Becher = ${fromLiter} Becher`] : []),
    ...(fromRest > 1 ? [`${qty(rest, 'ml')} = ${fromRest} · 250 ml: Das sind ${fromRest} Becher.`] : fromRest === 1 ? [`${qty(rest, 'ml')} sind noch 1 Becher.`] : []),
    ...(liter > 0 && rest > 0 ? [`${fromLiter} Becher + ${fromRest} Becher = ${fromLiter + fromRest} Becher`] : []),
  ];
}

const umfuellen: Form = (rng, stufe, ab) => {
  const who = pickPerson(rng);
  const ml = rng.pick(stufe === 1 ? [500, 1000, 1500, 2000] : [500, 750, 1000, 1250, 1500, 2000, 2500, 3000]);
  const value = ml / 250;
  const amount = ml % 1000 === 0 ? qty(ml / 1000, 'l') : ml < 1000 ? qty(ml, 'ml') : mixedMl(ml);
  const context = `${who.name} füllt ${amount} Saft in Becher. In einen Becher passen ${qty(250, 'ml')}.`;
  const prompt = `Wie viele Becher kann ${who.name} füllen?`;
  return {
    key: `becherfuellen:${ml}`,
    ab,
    context,
    prompt,
    // The cup of the story, full: one 250 ml cup (T15).
    visual: { type: 'container', capacityMl: 250, fillMl: 250, stepMl: 50 },
    answer: { kind: 'number', value, after: 'Becher', label: 'Anzahl Becher' },
    hints: [HINT_L, ml >= 1000 ? 'Wie oft passen 250 ml in 1 l?' : 'Wie oft passen 250 ml hinein?'],
    steps: becherSteps(ml),
    bugs: numberBugs([{ id: 'liter-25', match: ml / 25, hint: 'In einen Becher passen 250 ml, nicht 25 ml.' }, { id: 'becher-plus', match: ml + 250, hint: 'Der Saft verteilt sich auf Becher. Wie oft passen 250 ml hinein?' }], value),
    praise: 'Du hast 250 ml als Maß für einen Becher genommen.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'GM.sachsituationen'],
  };
};

export const hohlmasseSkill: SkillDef = {
  ...SKILL,
  title: 'Liter und Milliliter',
  description: 'Du misst, wie viel in ein Gefäß passt.',
  stufen: { 1: 'l oder ml wählen und den Messbecher lesen', 2: '1 l sind 1000 ml; ½ l sind 500 ml', 3: '¼ l und ¾ l, in Becher umfüllen' },
  kmk: KMK,
  optional: 'extra',
  generate: generator(SKILL, {
    1: [einheitWaehlen, messbecher],
    2: [lZuMl, lMlZuMl, mlZuL, halberLiter],
    3: [viertel, umfuellen],
  }),
};
