/**
 * Gramm und Kilogramm (docs/research.md §6).
 * AB I: choose g or kg, read the scale (step 100 g, from Stufe 2 also 50 g).
 * AB II: 1 kg = 1000 g, 2 kg 300 g = 2300 g.
 * AB III: ½ kg = 500 g, add weights, the Stützpunkt Packung Mehl.
 */
import { BOX, NBSP, fmtMixed } from '../../core/format';
import type { ChoiceOption, SkillDef } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickPerson, plural } from '../shared';
import { fromLabel, generator, qty, sr, unitChoiceSr, type Form } from './helpers';

const SKILL = { id: 'groessen.gewicht', topicId: 'groessen' } as const;
const KMK = ['GM.gewicht', 'GM.einheiten'];

const HINT_KG = '1 kg sind 1000 g. Denk an die Packung Mehl.';
const HINT_HALB = 'Nimm die Hälfte von 1000 g.';
const HINT_ALLES_GRAMM = 'Rechne zuerst alles in Gramm um.';
const HINT_STRICH = 'Schau: Wie viel Gramm ist ein Strich?';

const mixedG = (g: number) => fmtMixed(g, 1000, 'kg', 'g');

interface Ding {
  text: string;
  value: number;
  unit: 'g' | 'kg';
}

const DINGE: readonly Ding[] = [
  { text: 'Ein Apfel wiegt', value: 150, unit: 'g' },
  { text: 'Eine Tafel Schokolade wiegt', value: 100, unit: 'g' },
  { text: 'Ein Brief wiegt', value: 20, unit: 'g' },
  { text: 'Eine Banane wiegt', value: 120, unit: 'g' },
  { text: 'Ein Ei wiegt', value: 60, unit: 'g' },
  { text: 'Ein Bonbon wiegt', value: 5, unit: 'g' },
  { text: 'Ein Stück Butter wiegt', value: 250, unit: 'g' },
  { text: 'Ein Hund wiegt', value: 12, unit: 'kg' },
  { text: 'Ein Kind wiegt', value: 30, unit: 'kg' },
  { text: 'Eine Katze wiegt', value: 4, unit: 'kg' },
  { text: 'Ein Schulranzen wiegt', value: 3, unit: 'kg' },
  { text: 'Eine Melone wiegt', value: 2, unit: 'kg' },
  { text: 'Ein Sack Kartoffeln wiegt', value: 10, unit: 'kg' },
  { text: 'Ein Fahrrad wiegt', value: 15, unit: 'kg' },
];

const einheitWaehlen: Form = (rng, _stufe, ab) => {
  const d = rng.pick(DINGE);
  const other = d.unit === 'g' ? 'kg' : 'g';
  const prompt = `${d.text} ${d.value} ${BOX}. Welche Einheit passt?`;
  const wrong: ChoiceOption = {
    label: other,
    whyWrong: other === 'kg' ? `${qty(d.value, 'kg')} sind sehr schwer. Eine Packung Mehl wiegt 1 kg.` : `${qty(d.value, 'g')} sind ganz leicht. Ein Stift wiegt etwa 10 g.`,
  };
  const answer = makeChoice(rng, { label: d.unit }, [wrong], { layout: 'symbols' });
  return {
    key: `einheit:${d.text}`,
    ab,
    prompt,
    answer,
    hints: ['Eine Packung Mehl wiegt 1 kg.', 'Ein Stift wiegt etwa 10 g.'],
    steps: ['Eine Packung Mehl wiegt 1 kg. Ein Stift wiegt etwa 10 g.', `${d.text} ${qty(d.value, d.unit)}.`],
    praise: 'Du hast das Gewicht mit Mehl und Stift verglichen.',
    srText: sr(prompt, unitChoiceSr(answer)),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

/** Labelled every 100 g up to 1000 g and every 200 g up to 2000 g, as the scale draws it (labelStep in src/ui/visuals/ScaleVisual.tsx). */
const labelOf = (max: number) => (max > 1000 ? 200 : 100);

/** The pointer from the labelled number before it, as in the aria-label of the scale. */
function zeigerText(max: number, step: number, g: number): string {
  const { last, ticks } = fromLabel(g, labelOf(max), step);
  return ticks === 0 ? `Der Zeiger zeigt genau auf die Zahl ${g}.` : `Der Zeiger steht ${ticks} ${plural(ticks, 'Strich', 'Striche')} nach der Zahl ${last}.`;
}

const scaleSr = (max: number, step: number, g: number) => `Küchenwaage bis ${qty(max, 'g')}. Ein Strich bedeutet ${qty(step, 'g')}. ${zeigerText(max, step, g)}`;

/** The worked reading, as the hint says it: the labelled number before the pointer, then tick by tick. */
function scaleSteps(max: number, step: number, g: number): string[] {
  const { last, ticks } = fromLabel(g, labelOf(max), step);
  return [
    `Ein Strich sind ${qty(step, 'g')}.`,
    zeigerText(max, step, g),
    ticks > 0 && last > 0 ? `${qty(last, 'g')} + ${qty(ticks * step, 'g')} = ${qty(g, 'g')}` : `Das sind ${qty(g, 'g')}.`,
  ];
}

const LASTEN = ['das Mehl', 'der Zucker', 'das Obst', 'der Reis', 'der Käse', 'das Gemüse'];

const waageLesen: Form = (rng, stufe, ab) => {
  const step = stufe === 1 ? 100 : rng.pick([100, 50]);
  const max = 1000;
  const g = rng.int(1, max / step - 1) * step;
  const marks = g / step;
  const load = rng.pick(LASTEN);
  const prompt = `Lies die Waage ab. Wie viel wiegt ${load}?`;
  return {
    key: `waage:${step}:${g}`,
    ab,
    prompt,
    visual: { type: 'scale', maxGrams: max, stepGrams: step, grams: g },
    answer: { kind: 'number', value: g, unit: 'g', label: 'Gewicht in Gramm' },
    hints: [HINT_STRICH, 'Lies die Zahl vor dem Zeiger. Geh dann Strich für Strich weiter.'],
    steps: scaleSteps(max, step, g),
    bugs: numberBugs([{ id: 'skala-schritt', match: marks * 10, hint: HINT_STRICH }, { id: 'skala-schritt', match: marks, hint: HINT_STRICH }], g),
    praise: 'Du hast zuerst den Schritt von Strich zu Strich gelesen.',
    srText: sr(prompt, scaleSr(max, step, g)),
    kmk: KMK,
  };
};

const kgZuG: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 9);
  const value = n * 1000;
  const prompt = 'Schreibe in Gramm.';
  const expression = `${qty(n, 'kg')} = ${BOX}${NBSP}g`;
  return {
    key: `kg:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'g', label: 'Gewicht in Gramm' },
    hints: n === 1 ? ['Denk an die Packung Mehl.', 'Nimm 10-mal 100 g.'] : [HINT_KG, `Nimm ${n}-mal 1000 g.`],
    steps: [n === 1 ? `10 · 100 g = ${qty(value, 'g')}` : `${qty(n, 'kg')} = ${n} · 1000 g = ${qty(value, 'g')}`],
    bugs: numberBugs([{ id: 'kg-100', match: n * 100, hint: n === 1 ? 'Eine Packung Mehl wiegt 1 kg. Das sind 10-mal 100 g.' : HINT_KG }], value),
    praise: 'Du hast an 1000 g pro Kilogramm gedacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const kgGZuG: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9);
  const g = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 10, rng.int(1, 9) * 100 + rng.int(1, 9) * 10]);
  const value = n * 1000 + g;
  const prompt = 'Schreibe in Gramm.';
  const expression = `${mixedG(value)} = ${BOX}${NBSP}g`;
  return {
    key: `kgg:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'g', label: 'Gewicht in Gramm' },
    hints: [HINT_KG, 'Rechne zuerst die Kilogramm um. Dann kommen die Gramm dazu.'],
    steps: [`${qty(n, 'kg')} = ${qty(n * 1000, 'g')}`, `${qty(n * 1000, 'g')} + ${qty(g, 'g')} = ${qty(value, 'g')}`],
    bugs: numberBugs(
      [
        { id: 'kg-100', match: n * 100 + g, hint: HINT_KG },
        { id: 'einheit-gemischt', match: n + g, hint: HINT_ALLES_GRAMM },
        g < 100 && { id: 'kg-null', match: n * 1000 + g * 10, hint: `${qty(g, 'g')} haben keine Hunderter. Bei den Hundertern steht eine 0.` },
      ],
      value,
    ),
    praise: g < 100 ? 'Du hast an die 0 bei den Hundertern gedacht.' : 'Du hast die Kilogramm in Gramm umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const gZuKgG: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 9);
  const g = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 10, rng.int(1, 9) * 100 + rng.int(1, 9) * 10]);
  const value = n * 1000 + g;
  const fields = [{ id: 'kg', value: n, after: 'kg', label: 'Kilogramm' }, { id: 'g', value: g, after: 'g', label: 'Gramm' }];
  const prompt = 'Schreibe in Kilogramm und Gramm.';
  const expression = `${qty(value, 'g')} = ${BOX}${NBSP}kg ${BOX}${NBSP}g`;
  return {
    key: `gkg:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [HINT_KG, 'Die Tausender sind die Kilogramm. Der Rest bleibt in Gramm.'],
    steps: [`${qty(n * 1000, 'g')} = ${qty(n, 'kg')}`, `Es bleiben ${qty(g, 'g')}.`, `${qty(value, 'g')} = ${mixedG(value)}`],
    bugs: multiBugs([{ id: 'kg-100', match: { kg: Math.floor(value / 100), g: value % 100 }, hint: HINT_KG }], fields),
    praise: 'Du hast aus 1000 g ein Kilogramm gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const gZuKg: Form = (rng, _stufe, ab) => {
  const n = rng.int(2, 9);
  const prompt = 'Schreibe in Kilogramm.';
  const expression = `${qty(n * 1000, 'g')} = ${BOX}${NBSP}kg`;
  return {
    key: `zurueck:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, unit: 'kg', label: 'Gewicht in Kilogramm' },
    hints: [HINT_KG, 'Wie oft passen 1000 g hinein?'],
    steps: [`${qty(n * 1000, 'g')} = ${n} · 1000 g = ${qty(n, 'kg')}`],
    bugs: numberBugs([{ id: 'kg-100', match: n * 10, hint: HINT_KG }, { id: 'kg-100', match: n * 100, hint: HINT_KG }], n),
    praise: 'Du hast mit 1000 g pro Kilogramm gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const waageKg: Form = (rng, _stufe, ab) => {
  const g = rng.int(11, 19) * 100;
  const load = rng.pick(LASTEN);
  const fields = [{ id: 'kg', value: 1, after: 'kg', label: 'Kilogramm' }, { id: 'g', value: g - 1000, after: 'g', label: 'Gramm' }];
  const prompt = `Lies die Waage ab. Wie viel wiegt ${load}?`;
  return {
    key: `waagekg:${g}`,
    ab,
    prompt,
    visual: { type: 'scale', maxGrams: 2000, stepGrams: 100, grams: g },
    answer: { kind: 'multi', fields },
    hints: [HINT_STRICH, 'Nach 1000 g beginnt das zweite Kilogramm.'],
    steps: [...scaleSteps(2000, 100, g), `${qty(g, 'g')} = ${mixedG(g)}`],
    bugs: multiBugs([{ id: 'kg-100', match: { kg: Math.floor(g / 100), g: 0 }, hint: HINT_KG }, { id: 'skala-schritt', match: { kg: 1, g: (g - 1000) / 10 }, hint: HINT_STRICH }], fields),
    praise: 'Du hast auf der Waage das Kilogramm erkannt.',
    srText: sr(prompt, scaleSr(2000, 100, g)),
    kmk: KMK,
  };
};

const halbesKg: Form = (rng, _stufe, ab) => {
  const kind = rng.int(1, 3);
  const n = rng.int(1, 8);
  const x = rng.int(1, 4) * 100;
  const value = kind === 1 ? 500 : kind === 2 ? 500 + x : n * 1000 + 500;
  const left = kind === 1 ? `½${NBSP}kg` : kind === 2 ? `½${NBSP}kg + ${qty(x, 'g')}` : `${qty(n, 'kg')} + ½${NBSP}kg`;
  const prompt = kind === 1 ? 'Schreibe in Gramm.' : 'Rechne in Gramm.';
  const expression = `${left} = ${BOX}${NBSP}g`;
  return {
    key: kind === 1 ? 'halb' : kind === 2 ? `halbplus:${x}` : `kghalb:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'g', label: 'Gewicht in Gramm' },
    hints: [HINT_HALB, 'Denk an die halbe Packung Mehl.'],
    steps: [`1 kg = ${qty(1000, 'g')}`, `Die Hälfte: 1000 g : 2 = ${qty(500, 'g')}`, ...(kind === 2 ? [`${qty(500, 'g')} + ${qty(x, 'g')} = ${qty(value, 'g')}`] : kind === 3 ? [`${qty(n * 1000, 'g')} + ${qty(500, 'g')} = ${qty(value, 'g')}`] : [])],
    bugs: numberBugs([{ id: 'halb-kg', match: kind === 1 ? 50 : kind === 2 ? 50 + x : n * 1000 + 50, hint: HINT_HALB }], value),
    praise: 'Du hast die Hälfte von 1000 g genommen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const zusammen: Form = (rng, _stufe, ab) => {
  const who = pickPerson(rng);
  const mixed = rng.chance(0.5);
  if (mixed) {
    const n = rng.int(1, 3);
    const g = rng.int(1, 9) * 50;
    const value = n * 1000 + g;
    const context = `${who.name} kauft ${qty(n, 'kg')} Mehl und ${qty(g, 'g')} Butter.`;
    const prompt = 'Wie schwer ist alles zusammen?';
    return {
      key: `add:${n}:${g}`,
      ab,
      context,
      prompt,
      answer: { kind: 'number', value, unit: 'g', label: 'Gewicht in Gramm' },
      hints: [HINT_ALLES_GRAMM, HINT_KG],
      steps: [`${qty(n, 'kg')} = ${qty(n * 1000, 'g')}`, `${qty(n * 1000, 'g')} + ${qty(g, 'g')} = ${qty(value, 'g')}`],
      bugs: numberBugs([{ id: 'einheit-gemischt', match: n + g, hint: HINT_ALLES_GRAMM }, { id: 'kg-100', match: n * 100 + g, hint: HINT_KG }], value),
      praise: 'Du hast zuerst alles in Gramm umgerechnet.',
      srText: sr(context, prompt),
      kmk: [...KMK, 'GM.sachsituationen'],
    };
  }
  const a = rng.int(2, 9) * 100;
  const b = rng.int(2, 9) * 100;
  const sum = a + b;
  const prompt = 'Rechne zusammen.';
  if (sum < 1000) {
    const expression = `${qty(a, 'g')} + ${qty(b, 'g')} = ${BOX}${NBSP}g`;
    return {
      key: `addg:${a}:${b}`,
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value: sum, unit: 'g', label: 'Gewicht in Gramm' },
      hints: ['Rechne mit den Hundertern.', 'Die Einheit bleibt gleich.'],
      steps: [`${a} + ${b} = ${sum}`, `Zusammen: ${qty(sum, 'g')}`],
      praise: 'Du hast beide Gewichte in Gramm gerechnet.',
      srText: sr(prompt, expression),
      kmk: KMK,
    };
  }
  const fields = [{ id: 'kg', value: Math.floor(sum / 1000), after: 'kg', label: 'Kilogramm' }, { id: 'g', value: sum % 1000, after: 'g', label: 'Gramm' }];
  const expression = `${qty(a, 'g')} + ${qty(b, 'g')} = ${BOX}${NBSP}kg ${BOX}${NBSP}g`;
  return {
    key: `addkg:${a}:${b}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst in Gramm zusammen.', '1000 g sind 1 kg.'],
    steps: [`${qty(a, 'g')} + ${qty(b, 'g')} = ${qty(sum, 'g')}`, `${qty(sum, 'g')} = ${mixedG(sum)}`],
    bugs: multiBugs([{ id: 'kg-100', match: { kg: Math.floor(sum / 100), g: 0 }, hint: '1000 g sind 1 kg.' }], fields),
    praise: 'Du hast aus 1000 g ein Kilogramm gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mehlPackungen: Form = (rng, _stufe, ab) => {
  const n = rng.int(2, 8);
  const value = n * 1000;
  const context = 'Eine Packung Mehl wiegt 1 kg.';
  const prompt = `Wie viel Gramm wiegen ${n} Packungen?`;
  return {
    key: `mehl:${n}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'g', label: 'Gewicht in Gramm' },
    hints: [HINT_KG, `Nimm ${n}-mal 1000 g.`],
    steps: [`1 kg = ${qty(1000, 'g')}`, `${n} · 1000 g = ${qty(value, 'g')}`],
    bugs: numberBugs([{ id: 'kg-100', match: n * 100, hint: HINT_KG }, { id: 'einheit-gemischt', match: n, hint: 'Das sind Kilogramm. Gefragt sind Gramm.' }], value),
    praise: 'Du hast die Packung Mehl als Maß genommen.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

const SO_SCHWER = ['Eine große Flasche Wasser', 'Ein dickes Wörterbuch', 'Eine Tüte Zucker', 'Ein Laib Brot'];
const LEICHTER = ['Ein Radiergummi', 'Eine Feder', 'Ein Blatt Papier', 'Ein Bleistift'];
const SCHWERER = ['Ein Fahrrad', 'Ein Schulkind', 'Ein Sofa', 'Ein Kühlschrank'];

const mehlVergleich: Form = (rng, _stufe, ab) => {
  const prompt = 'Was wiegt ungefähr so viel wie eine Packung Mehl?';
  const a = rng.pick(LEICHTER);
  const b = rng.pick(SCHWERER);
  const c = rng.pick(LEICHTER.filter((x) => x !== a));
  const right = rng.pick(SO_SCHWER);
  return {
    key: `vergleich:${right}:${a}:${b}:${c}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right }, [
      { label: a, whyWrong: 'Das wiegt nur ein paar Gramm. Eine Packung Mehl wiegt 1 kg.' },
      { label: b, whyWrong: 'Das ist viel schwerer. Eine Packung Mehl wiegt 1 kg.' },
      { label: c, whyWrong: 'Das wiegt nur ein paar Gramm. Eine Packung Mehl wiegt 1 kg.' },
    ]),
    hints: ['Eine Packung Mehl wiegt 1 kg.', 'Stell dir vor: Du hältst das Ding in der Hand.'],
    steps: ['Eine Packung Mehl wiegt 1 kg.', `${right}: Das wiegt ungefähr so viel.`],
    praise: 'Du hast das Gewicht mit der Packung Mehl verglichen.',
    srText: sr(prompt),
    kmk: ['GM.gewicht', 'GM.vorstellung'],
  };
};

export const gewichtSkill: SkillDef = {
  ...SKILL,
  title: 'Gramm und Kilogramm',
  description: 'Du wiegst und wandelst Gramm und Kilogramm um.',
  stufen: { 1: 'g oder kg wählen und die Waage ablesen', 2: '1 kg sind 1000 g: Gewichte umwandeln', 3: '½ kg, Gewichte zusammen, die Packung Mehl' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [einheitWaehlen, waageLesen],
    2: [kgZuG, kgGZuG, gZuKgG, gZuKg, waageKg],
    3: [halbesKg, zusammen, mehlPackungen, mehlVergleich],
  }),
};
