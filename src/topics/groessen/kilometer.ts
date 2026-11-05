/**
 * Kilometer (docs/research.md §6).
 * AB I: 1 km = 1000 m, how often 100 m fit, choose m or km.
 * AB II: 2 km 500 m = 2500 m up to 9 km, and short stories.
 * AB III: ½ km = 500 m; 1,7 km = 1700 m on Stufe 3 only (§2.2).
 */
import { BOX, NBSP, fmt, fmtMixed, fmtQty } from '../../core/format';
import type { ChoiceOption, SkillDef } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, pickTwo, pickPerson } from '../shared';
import { fromStufe, generator, qty, sr, unitChoiceSr, type Form } from './helpers';

const SKILL = { id: 'groessen.kilometer', topicId: 'groessen' } as const;
const KMK = ['GM.laenge', 'GM.einheiten'];

const HINT_KM = '1 km sind 1000 m.';
const HINT_ALLES_METER = 'Rechne zuerst alles in Meter um.';

const mixedM = (m: number) => fmtMixed(m, 1000, 'km', 'm');

const einKm: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 9);
  const value = n * 1000;
  const prompt = 'Schreibe in Meter.';
  const expression = `${qty(n, 'km')} = ${BOX}${NBSP}m`;
  return {
    key: `km:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'm', label: 'Länge in Meter' },
    hints: n === 1 ? ['Du gehst 1 km in etwa 15 Minuten.', 'Nimm 10-mal 100 m.'] : [HINT_KM, `Nimm ${n}-mal 1000 m.`],
    steps: [n === 1 ? `10 · 100 m = ${qty(value, 'm')}` : `${qty(n, 'km')} = ${n} · 1000 m = ${qty(value, 'm')}`],
    bugs: numberBugs([{ id: 'km-100', match: n * 100, hint: n === 1 ? 'Das sind nur 100 m. Nimm 10-mal 100 m.' : HINT_KM }, { id: 'km-10', match: n * 10, hint: n === 1 ? 'Nimm 10-mal 100 m.' : HINT_KM }], value),
    praise: 'Du hast an 1000 m pro Kilometer gedacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const zurueckKm: Form = (rng, _stufe, ab) => {
  const n = rng.int(2, 9);
  const prompt = 'Schreibe in Kilometer.';
  const expression = `${qty(n * 1000, 'm')} = ${BOX}${NBSP}km`;
  return {
    key: `zurueck:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: n, unit: 'km', label: 'Länge in Kilometer' },
    hints: [HINT_KM, 'Wie oft passen 1000 m hinein?'],
    steps: [`${qty(n * 1000, 'm')} = ${n} · 1000 m = ${qty(n, 'km')}`],
    bugs: numberBugs([{ id: 'km-100', match: n * 10, hint: HINT_KM }, { id: 'km-100', match: n * 100, hint: HINT_KM }], n),
    praise: 'Du hast mit 1000 m pro Kilometer gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const hundertInKm: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 3);
  const value = n * 10;
  const prompt = `Wie oft passen 100 m in ${qty(n, 'km')}?`;
  return {
    key: `hundert:${n}`,
    ab,
    prompt,
    answer: { kind: 'number', value, before: '100 m passen', after: 'mal hinein.', label: 'Wie oft' },
    hints: [HINT_KM, 'Rechne in 100er-Schritten bis 1 km.'],
    steps: [`${qty(n, 'km')} = ${qty(n * 1000, 'm')}`, `${n * 1000} : 100 = ${value}`, `100 m passen ${value}-mal hinein.`],
    bugs: numberBugs([{ id: 'km-100', match: n, hint: `${qty(n, 'km')} sind ${qty(n * 1000, 'm')}. Wie oft passen 100 m hinein?` }, { id: 'km-100', match: n * 100, hint: `${qty(n, 'km')} sind ${qty(n * 1000, 'm')}. Wie oft passen 100 m hinein?` }], value),
    praise: 'Du hast den Kilometer in 100-m-Stücke geteilt.',
    srText: sr(prompt),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

interface Strecke {
  text: string;
  value: number;
  unit: 'm' | 'km';
}

const STRECKEN: readonly Strecke[] = [
  { text: 'Der Schulhof ist', value: 80, unit: 'm' },
  { text: 'Das Schwimmbecken ist', value: 25, unit: 'm' },
  { text: 'Der Sportplatz ist', value: 100, unit: 'm' },
  { text: 'Die Brücke ist', value: 60, unit: 'm' },
  { text: 'Der Weg zum Bäcker ist', value: 300, unit: 'm' },
  { text: 'Der Schulweg ist', value: 800, unit: 'm' },
  { text: 'Die Rennbahn ist', value: 400, unit: 'm' },
  { text: 'Die Radtour ist', value: 15, unit: 'km' },
  { text: 'Die Wanderung ist', value: 6, unit: 'km' },
  { text: 'Die Zugfahrt in die Ferien ist', value: 400, unit: 'km' },
  { text: 'Der Weg in die nächste Stadt ist', value: 20, unit: 'km' },
  { text: 'Die Fahrt zum Zoo ist', value: 30, unit: 'km' },
  { text: 'Die Busfahrt zum Ausflug ist', value: 50, unit: 'km' },
];

const einheitWaehlen: Form = (rng, stufe, ab) => {
  const s = rng.pick(STRECKEN);
  const other = s.unit === 'm' ? 'km' : 'm';
  const prompt = `${s.text} ${s.value} ${BOX} lang. Welche Einheit passt?`;
  const wrongs: ChoiceOption[] = [
    { label: other, whyWrong: other === 'km' ? `${qty(s.value, 'km')} sind ein sehr weiter Weg.` : `${qty(s.value, 'm')} sind nur ein kurzer Weg.` },
    ...(stufe >= 2 ? [{ label: 'cm', whyWrong: `${qty(s.value, 'cm')} sind viel zu kurz für diesen Weg.` }] : []),
  ];
  const answer = makeChoice(rng, { label: s.unit }, wrongs, { layout: 'symbols' });
  return {
    key: `einheit:${s.text}:${s.value}`,
    ab,
    prompt,
    answer,
    hints: ['Stell dir den Weg vor. Gehst du den Weg in ein paar Minuten?', 'Du gehst 1 km in etwa 15 Minuten.'],
    steps: [`Du gehst 1 km in etwa 15 Minuten.`, `${s.text} ${qty(s.value, s.unit)} lang.`],
    praise: 'Du hast dir den Weg gut vorgestellt.',
    srText: sr(prompt, unitChoiceSr(answer)),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

/** Whole km next to a metre part: at most 8, so that the value stays ≤ 9 km (§6). */
const MAX_KM_MIT_REST = 8;

const kmMZuM: Form = (rng, stufe, ab) => {
  const n = rng.int(1, MAX_KM_MIT_REST);
  const m = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 10, rng.int(1, 9) * 100 + rng.int(1, 9) * 10]);
  const value = n * 1000 + m;
  const prompt = 'Schreibe in Meter.';
  const expression = `${mixedM(value)} = ${BOX}${NBSP}m`;
  return {
    key: `kmm:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'm', label: 'Länge in Meter' },
    hints: [HINT_KM, 'Rechne zuerst die Kilometer um. Dann kommen die Meter dazu.'],
    steps: [`${qty(n, 'km')} = ${qty(n * 1000, 'm')}`, `${qty(n * 1000, 'm')} + ${qty(m, 'm')} = ${qty(value, 'm')}`],
    bugs: numberBugs(
      [
        { id: 'km-100', match: n * 100 + m, hint: HINT_KM },
        { id: 'einheit-gemischt', match: n + m, hint: HINT_ALLES_METER },
        m < 100 && { id: 'km-null', match: n * 1000 + m * 10, hint: `${qty(m, 'm')} haben keine Hunderter. Bei den Hundertern steht eine 0.` },
      ],
      value,
    ),
    praise: m < 100 ? 'Du hast an die 0 bei den Hundertern gedacht.' : 'Du hast die Kilometer in Meter umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mZuKmM: Form = (rng, stufe, ab) => {
  const n = rng.int(1, MAX_KM_MIT_REST);
  const m = stufe === 1 ? rng.int(1, 9) * 100 : rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 10, rng.int(1, 9) * 100 + rng.int(1, 9) * 10]);
  const value = n * 1000 + m;
  const fields = [{ id: 'km', value: n, after: 'km', label: 'Kilometer' }, { id: 'm', value: m, after: 'm', label: 'Meter' }];
  const prompt = 'Schreibe in Kilometer und Meter.';
  const expression = `${qty(value, 'm')} = ${BOX}${NBSP}km ${BOX}${NBSP}m`;
  return {
    key: `mkm:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [HINT_KM, 'Die Tausender sind die Kilometer. Der Rest bleibt in Metern.'],
    steps: [`${qty(n * 1000, 'm')} = ${qty(n, 'km')}`, `Es bleiben ${qty(m, 'm')}.`, `${qty(value, 'm')} = ${mixedM(value)}`],
    bugs: multiBugs(
      [
        { id: 'km-100', match: { km: Math.floor(value / 100), m: value % 100 }, hint: HINT_KM },
        m % 100 === 0 && { id: 'km-null', match: { km: n, m: m / 100 }, hint: `Nur die Tausender werden Kilometer. Es bleiben Hunderter in Metern.` },
      ],
      fields,
    ),
    praise: 'Du hast aus 1000 m einen Kilometer gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const laufen: Form = (rng, _stufe, ab) => {
  const [a, b] = pickTwo(rng);
  const n = rng.int(1, 4);
  const m = rng.int(1, 8) * 100;
  const x = rng.int(1, 9) * 100;
  const value = n * 1000 + m + x;
  const context = `${a.name} läuft ${mixedM(n * 1000 + m)}. ${b.name} läuft ${qty(x, 'm')}.`;
  const prompt = 'Wie viele Meter laufen beide zusammen?';
  return {
    key: `laufen:${n}:${m}:${x}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'm', label: 'Länge in Meter' },
    hints: [HINT_ALLES_METER, HINT_KM],
    steps: [`${mixedM(n * 1000 + m)} = ${qty(n * 1000 + m, 'm')}`, `${qty(n * 1000 + m, 'm')} + ${qty(x, 'm')} = ${qty(value, 'm')}`],
    bugs: numberBugs(
      [
        { id: 'km-100', match: n * 100 + m + x, hint: HINT_KM },
        { id: 'einheit-gemischt', match: n + m + x, hint: HINT_ALLES_METER },
      ],
      value,
    ),
    praise: 'Du hast zuerst alles in Meter umgerechnet.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'GM.sachsituationen'],
  };
};

const bisKm: Form = (rng, _stufe, ab) => {
  const who = pickPerson(rng);
  const gone = rng.int(1, 19) * 50;
  const value = 1000 - gone;
  const context = `${who.name} ist schon ${qty(gone, 'm')} gelaufen.`;
  const prompt = 'Wie viele Meter fehlen noch bis 1 km?';
  return {
    key: `biskm:${gone}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: 'm', label: 'Fehlende Meter' },
    hints: [HINT_KM, `Rechne von ${qty(gone, 'm')} weiter bis 1 km.`],
    steps: [`1 km = ${qty(1000, 'm')}`, `${qty(1000, 'm')} − ${qty(gone, 'm')} = ${qty(value, 'm')}`],
    bugs: numberBugs([{ id: 'addiert', match: 1000 + gone, hint: 'Es fehlt nur noch ein Teil des Weges. Das ist weniger als 1 km.' }], value),
    praise: 'Du hast von hier aus bis 1 km gerechnet.',
    srText: sr(context, prompt),
    kmk: [...KMK, 'GM.vorstellung'],
  };
};

const halberKm: Form = (rng, _stufe, ab) => {
  const kind = rng.int(1, 3);
  const halfHint = 'Nimm die Hälfte von 1000 m.';
  if (kind === 1) {
    const prompt = 'Schreibe in Meter.';
    const expression = `½${NBSP}km = ${BOX}${NBSP}m`;
    return {
      key: 'halb',
      ab,
      prompt,
      expression,
      answer: { kind: 'number', value: 500, unit: 'm', label: 'Länge in Meter' },
      hints: [HINT_KM, halfHint],
      steps: [`1 km = ${qty(1000, 'm')}`, `Die Hälfte: 1000 m : 2 = ${qty(500, 'm')}`],
      bugs: numberBugs([{ id: 'km-halb', match: 50, hint: halfHint }, { id: 'km-halb', match: 5, hint: halfHint }], 500),
      praise: 'Du hast die Hälfte von 1000 m genommen.',
      srText: sr(prompt, expression),
      kmk: KMK,
    };
  }
  const n = rng.int(1, 8);
  const x = rng.int(1, 4) * 100;
  const value = kind === 2 ? 500 + x : n * 1000 + 500;
  const prompt = 'Rechne in Meter.';
  const expression = kind === 2 ? `½${NBSP}km + ${qty(x, 'm')} = ${BOX}${NBSP}m` : `${qty(n, 'km')} + ½${NBSP}km = ${BOX}${NBSP}m`;
  return {
    key: kind === 2 ? `halbplus:${x}` : `kmhalb:${n}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'm', label: 'Länge in Meter' },
    hints: [HINT_ALLES_METER, halfHint],
    steps: [`½${NBSP}km = ${qty(500, 'm')}`, kind === 2 ? `${qty(500, 'm')} + ${qty(x, 'm')} = ${qty(value, 'm')}` : `${qty(n * 1000, 'm')} + ${qty(500, 'm')} = ${qty(value, 'm')}`],
    bugs: numberBugs([{ id: 'km-halb', match: kind === 2 ? 50 + x : n * 1000 + 50, hint: halfHint }], value),
    praise: 'Du hast die Hälfte von 1000 m genommen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const kommaZuM: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, MAX_KM_MIT_REST);
  const d = rng.int(1, 9);
  const value = n * 1000 + d * 100;
  const km = fmtQty(value / 1000, 'km');
  const prompt = 'Schreibe in Meter.';
  const expression = `${km} = ${BOX}${NBSP}m`;
  return {
    key: `komma:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'm', label: 'Länge in Meter' },
    hints: ['Vor dem Komma stehen die ganzen Kilometer.', `Die ${d} nach dem Komma heißt: ${d} · 100 m.`],
    steps: [`${qty(n, 'km')} = ${qty(n * 1000, 'm')}`, `${fmt(d / 10)}${NBSP}km = ${qty(d * 100, 'm')}`, `${qty(n * 1000, 'm')} + ${qty(d * 100, 'm')} = ${qty(value, 'm')}`],
    bugs: numberBugs(
      [
        { id: 'km-komma', match: n * 1000 + d, hint: `Die ${d} nach dem Komma sind ${d} · 100 m.` },
        { id: 'km-komma', match: n * 1000 + d * 10, hint: `Die ${d} nach dem Komma sind ${d} · 100 m.` },
        { id: 'km-100', match: n * 100 + d * 10, hint: HINT_KM },
      ],
      value,
    ),
    praise: 'Du hast die Stelle nach dem Komma richtig gelesen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mZuKomma: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, MAX_KM_MIT_REST);
  const d = rng.int(1, 9);
  const total = n * 1000 + d * 100;
  const value = total / 1000;
  const prompt = 'Schreibe in Kilometer mit Komma.';
  const expression = `${qty(total, 'm')} = ${BOX}${NBSP}km`;
  return {
    key: `zukomma:${total}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, decimals: 1, unit: 'km', label: 'Länge in Kilometer' },
    hints: [HINT_KM, 'Die Hunderter stehen nach dem Komma.'],
    steps: [`${qty(n * 1000, 'm')} = ${qty(n, 'km')}`, `${qty(d * 100, 'm')} = ${fmt(d / 10)}${NBSP}km`, `${qty(total, 'm')} = ${fmtQty(value, 'km')}`],
    bugs: numberBugs([{ id: 'km-100', match: total / 100, hint: HINT_KM }, { id: 'ohne-komma', match: total, hint: 'Setze das Komma. Vor dem Komma stehen die Kilometer.' }], value),
    praise: 'Du hast die Hunderter hinter das Komma geschrieben.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const gleichLang: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, MAX_KM_MIT_REST);
  const d = rng.int(1, 9);
  const total = n * 1000 + d * 100;
  const km = fmtQty(total / 1000, 'km');
  const prompt = `Was ist gleich lang wie ${km}?`;
  const why = `${HINT_KM} Die ${d} nach dem Komma sind ${d} · 100 m.`;
  return {
    key: `gleich:${total}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: qty(total, 'm') }, [
      { label: qty(n * 1000 + d * 10, 'm'), whyWrong: why },
      { label: qty(n * 100 + d * 10, 'm'), whyWrong: why },
      { label: qty(n * 1000 + d, 'm'), whyWrong: why },
    ]),
    hints: [HINT_KM, `Die ${d} nach dem Komma sind ${d} · 100 m.`],
    steps: [`${qty(n, 'km')} = ${qty(n * 1000, 'm')}`, `${qty(n * 1000, 'm')} + ${qty(d * 100, 'm')} = ${qty(total, 'm')}`],
    praise: 'Du hast die Kommazahl in Meter umgerechnet.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

export const kilometerSkill: SkillDef = {
  ...SKILL,
  title: 'Kilometer',
  description: 'Du weißt, wie lang ein Kilometer ist.',
  stufen: { 1: '1 km sind 1000 m; m oder km wählen', 2: 'Kilometer und Meter: 2 km 500 m bis 9 km', 3: '½ km und Kilometer mit Komma' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [einKm, zurueckKm, hundertInKm, einheitWaehlen, einheitWaehlen],
    2: [kmMZuM, kmMZuM, mZuKmM, laufen, bisKm],
    3: [halberKm, fromStufe(3, kommaZuM), fromStufe(3, mZuKomma), fromStufe(3, gleichLang)],
  }),
};
