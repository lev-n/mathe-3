/**
 * Millimeter, Zentimeter, Meter (docs/research.md §6).
 * AB I: measure on the ruler in cm and mm.
 * AB II: 1 cm = 10 mm, 3 cm 5 mm = 35 mm, from Stufe 2 also 2 m 15 cm = 215 cm.
 * AB III: from Stufe 2 1,20 m = 120 cm and mixed lengths with the comma (§2.2); on Stufe 1 order cm and mm.
 */
import { BOX, NBSP, fmtLength, fmtMixed, fmtQty } from '../../core/format';
import type { Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { multiBugs, numberBugs, plural } from '../shared';
import { fromStufe, generator, orderAnswerSteps, orderBug, orderBugs, orderChain, orderItems, orderSr, qty, restText, sr, zweiStellenText, type Form, type OrderItem } from './helpers';

const SKILL = { id: 'groessen.laengen', topicId: 'groessen' } as const;
const KMK = ['GM.laenge', 'GM.einheiten'];

const HINT_EINHEITEN = 'Rechne zuerst alles in die kleine Einheit um.';
const HINT_LINEAL_ENDE = 'Der Streifen beginnt nicht bei der 0. Zieh den Anfang vom Ende ab.';

const mixedMm = (mm: number) => fmtMixed(mm, 10, 'cm', 'mm');
const commaM = (cm: number) => fmtQty(cm / 100, 'm', 2);

/** The length of an object in mm by Stufe: whole and half cm, then half cm and any mm, then mostly any mm. */
function lengthOf(rng: Rng, stufe: Stufe, maxCm: number): number {
  if (stufe === 1) return rng.chance(0.5) ? rng.int(2, maxCm) * 10 : rng.int(1, maxCm - 1) * 10 + 5;
  if (stufe === 2) return rng.int(1, maxCm - 1) * 10 + (rng.chance(0.5) ? 5 : rng.int(1, 9));
  return rng.chance(0.3) ? rng.int(2, maxCm) * 10 : rng.int(1, maxCm - 1) * 10 + rng.int(1, 9);
}

/** '7 cm', '7 cm 4 mm', '0 cm': a place on the ruler. */
function rulerPos(mm: number): string {
  const cm = Math.floor(mm / 10);
  return mm % 10 === 0 ? qty(cm, 'cm') : `${qty(cm, 'cm')} ${qty(mm % 10, 'mm')}`;
}

/** The ruler in words, as in its aria-label: only the picture holds these numbers. */
function rulerSr(v: VisualOf<'ruler'>): string {
  const from = v.minCm ?? 0;
  const ruler = from > 0 ? `Abgebrochenes Lineal, es beginnt erst bei ${qty(from, 'cm')} und geht bis ${qty(v.maxCm, 'cm')}.` : `Lineal von 0 bis ${qty(v.maxCm, 'cm')}.`;
  return `${ruler} Ein Streifen beginnt bei ${rulerPos(v.startMm)} und endet bei ${rulerPos(v.startMm + v.lengthMm)}.`;
}

const WHOLE_HINTS = ['Der Streifen beginnt bei der 0. Lies das Ende ab.', 'Die langen Striche mit den Zahlen zeigen die Zentimeter.'];
const MM_HINTS = ['Lies zuerst die ganzen Zentimeter ab.', 'Rechne dann die kleinen Striche. Von Strich zu Strich ist 1 mm.'];

const messen: Form = (rng, stufe, ab) => {
  const lengthMm = lengthOf(rng, stufe, 11);
  const whole = lengthMm % 10 === 0;
  const cm = Math.floor(lengthMm / 10);
  const mm = lengthMm % 10;
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: 12, startMm: 0, lengthMm };
  const prompt = 'Wie lang ist der Streifen?';
  if (whole) {
    return {
      key: `messen:${lengthMm}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value: cm, unit: 'cm', label: 'Länge in Zentimeter' },
      hints: WHOLE_HINTS,
      steps: [`Der Streifen beginnt bei der 0.`, `Der Streifen endet bei ${qty(cm, 'cm')}.`, `Der Streifen ist ${qty(cm, 'cm')} lang.`],
      bugs: numberBugs([{ id: 'lineal-anfang', match: cm - 1, hint: 'Lege den Anfang auf die 0, nicht auf die 1.' }, { id: 'lineal-mm', match: lengthMm, hint: 'Gefragt sind Zentimeter, nicht Millimeter.' }], cm),
      praise: 'Du hast bei der 0 angefangen.',
      srText: sr(prompt, rulerSr(visual)),
      kmk: KMK,
    };
  }
  const fields = [{ id: 'cm', value: cm, after: 'cm', label: 'Zentimeter' }, { id: 'mm', value: mm, after: 'mm', label: 'Millimeter' }];
  return {
    key: `messenmm:${lengthMm}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: MM_HINTS,
    steps: [`Ganze Zentimeter bis zum Ende: ${qty(cm, 'cm')}.`, `Danach noch ${mm} ${plural(mm, 'kleiner Strich', 'kleine Striche')}: ${qty(mm, 'mm')}.`, `Der Streifen ist ${mixedMm(lengthMm)} lang.`],
    bugs: multiBugs([
      { id: 'lineal-anfang', match: { cm: cm - 1, mm }, hint: 'Lege den Anfang auf die 0, nicht auf die 1.' },
      { id: 'lineal-naechster-cm', match: { cm: cm + 1, mm }, hint: 'Der Streifen endet noch vor dem nächsten langen Strich.' },
    ], fields),
    praise: 'Du hast die kleinen Striche genau gelesen.',
    srText: sr(prompt, rulerSr(visual)),
    kmk: KMK,
  };
};

const messenVerschoben: Form = (rng, stufe, ab) => {
  const lengthMm = lengthOf(rng, stufe, 7);
  const minCm = stufe >= 2 && rng.chance(0.4) ? rng.int(1, 3) : 0;
  const startMm = (minCm + rng.int(1, 3)) * 10;
  const endMm = startMm + lengthMm;
  const visual: VisualOf<'ruler'> = { type: 'ruler', maxCm: Math.max(12, Math.ceil(endMm / 10) + 1), startMm, lengthMm, ...(minCm ? { minCm } : {}) };
  const prompt = minCm ? 'Das Lineal ist abgebrochen. Wie lang ist der Streifen?' : 'Wie lang ist der Streifen?';
  const cm = Math.floor(lengthMm / 10);
  const mm = lengthMm % 10;
  const steps = [`Anfang: ${mixedMm(startMm)}. Ende: ${mixedMm(endMm)}.`, `${mixedMm(endMm)} − ${mixedMm(startMm)} = ${mixedMm(lengthMm)}`];
  const hints = ['Lies den Anfang und das Ende ab.', 'Rechne vom Anfang bis zum Ende.'];
  if (mm === 0) {
    return {
      key: `verschoben:${startMm}:${lengthMm}:${minCm}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value: cm, unit: 'cm', label: 'Länge in Zentimeter' },
      hints,
      steps,
      bugs: numberBugs([{ id: 'lineal-ende', match: endMm / 10, hint: HINT_LINEAL_ENDE }, { id: 'lineal-anfang', match: cm - 1, hint: 'Rechne vom Anfang des Streifens bis zum Ende.' }], cm),
      praise: 'Du hast vom Anfang bis zum Ende gerechnet.',
      srText: sr(prompt, rulerSr(visual)),
      kmk: KMK,
    };
  }
  const fields = [{ id: 'cm', value: cm, after: 'cm', label: 'Zentimeter' }, { id: 'mm', value: mm, after: 'mm', label: 'Millimeter' }];
  return {
    key: `verschoben:${startMm}:${lengthMm}:${minCm}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints,
    steps,
    bugs: multiBugs([{ id: 'lineal-ende', match: { cm: Math.floor(endMm / 10), mm }, hint: HINT_LINEAL_ENDE }], fields),
    praise: 'Du hast vom Anfang bis zum Ende gerechnet.',
    srText: sr(prompt, rulerSr(visual)),
    kmk: KMK,
  };
};

const cmMmZuMm: Form = (rng, stufe, ab) => {
  const cm = rng.int(2, stufe === 1 ? 9 : 25);
  const mm = rng.int(1, 9);
  const value = cm * 10 + mm;
  const prompt = 'Schreibe in Millimeter.';
  const expression = `${mixedMm(value)} = ${BOX}${NBSP}mm`;
  const steps: (string | { text: string; visual: Visual })[] = [`${qty(cm, 'cm')} = ${cm} · 10 mm = ${qty(cm * 10, 'mm')}`, `${qty(cm * 10, 'mm')} + ${qty(mm, 'mm')} = ${qty(value, 'mm')}`];
  return {
    key: `cmmm:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'mm', label: 'Länge in Millimeter' },
    hints: ['1 cm sind 10 mm.', 'Rechne zuerst die Zentimeter in Millimeter um.'],
    steps: cm < 12 ? [{ text: `${mixedMm(value)} auf dem Lineal.`, visual: { type: 'ruler', maxCm: 13, startMm: 0, lengthMm: value } }, ...steps] : steps,
    bugs: numberBugs(
      [
        { id: 'mm-cm', match: cm * 100 + mm, hint: `1 cm sind 10 mm. ${qty(cm, 'cm')} sind also ${qty(cm * 10, 'mm')}.` },
        { id: 'einheiten-gemischt', match: cm + mm, hint: HINT_EINHEITEN },
      ],
      value,
    ),
    praise: 'Du hast die Zentimeter in Millimeter umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const cmZuMm: Form = (rng, stufe, ab) => {
  const cm = rng.int(2, stufe === 1 ? 9 : 40);
  const value = cm * 10;
  const prompt = 'Schreibe in Millimeter.';
  const expression = `${qty(cm, 'cm')} = ${BOX}${NBSP}mm`;
  return {
    key: `cm:${cm}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'mm', label: 'Länge in Millimeter' },
    hints: ['1 cm sind 10 mm.', `Nimm ${cm}-mal 10 mm.`],
    steps: [`${qty(cm, 'cm')} = ${cm} · 10 mm = ${qty(value, 'mm')}`],
    bugs: numberBugs([{ id: 'mm-cm', match: cm * 100, hint: '1 cm sind nur 10 mm.' }], value),
    praise: 'Du hast mit 10 mm pro Zentimeter gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mmZuCmMm: Form = (rng, _stufe, ab) => {
  const cm = rng.int(2, 9);
  const mm = rng.int(1, 9);
  const value = cm * 10 + mm;
  const fields = [{ id: 'cm', value: cm, after: 'cm', label: 'Zentimeter' }, { id: 'mm', value: mm, after: 'mm', label: 'Millimeter' }];
  const prompt = 'Schreibe in Zentimeter und Millimeter.';
  const expression = `${qty(value, 'mm')} = ${BOX}${NBSP}cm ${BOX}${NBSP}mm`;
  return {
    key: `mmcm:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['1 cm sind 10 mm.', 'Wie viele ganze Zehner stecken in der Zahl?'],
    steps: [`${qty(cm * 10, 'mm')} = ${qty(cm, 'cm')}`, `${restText(mm, 'mm')}.`, `${qty(value, 'mm')} = ${mixedMm(value)}`],
    bugs: multiBugs([{ id: 'mm-cm', match: { cm: mm, mm: cm }, hint: 'Die Zehner sind die Zentimeter. Die Einer bleiben Millimeter.' }, { id: 'mm-cm', match: { cm: value, mm: 0 }, hint: 'Das sind Millimeter. 10 mm sind 1 cm.' }], fields),
    praise: 'Du hast aus 10 mm einen Zentimeter gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const mCmZuCm: Form = (rng, _stufe, ab) => {
  const m = rng.int(1, 9);
  const cm = rng.chance(0.3) ? rng.int(1, 9) : rng.int(11, 99);
  const value = m * 100 + cm;
  const prompt = 'Schreibe in Zentimeter.';
  const expression = `${fmtLength(value)} = ${BOX}${NBSP}cm`;
  return {
    key: `mcm:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'cm', label: 'Länge in Zentimeter' },
    hints: ['1 m sind 100 cm.', 'Rechne zuerst die Meter in Zentimeter um.'],
    steps: [`${qty(m, 'm')} = ${m} · 100 cm = ${qty(m * 100, 'cm')}`, `${qty(m * 100, 'cm')} + ${qty(cm, 'cm')} = ${qty(value, 'cm')}`],
    bugs: numberBugs(
      [
        { id: 'einheiten-gemischt', match: m + cm, hint: HINT_EINHEITEN },
        { id: 'cm-100', match: m * 10 + cm, hint: '1 m sind 100 cm, nicht 10 cm.' },
        cm < 10 && { id: 'm-komma', match: m * 100 + cm * 10, hint: `${qty(cm, 'cm')} ${plural(cm, 'bleibt', 'bleiben')} ${qty(cm, 'cm')}. Der Zehner ist 0.` },
      ],
      value,
    ),
    praise: 'Du hast die Meter zuerst in Zentimeter umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

/** 1,20 m or 1,05 m: cm behind the comma. */
function commaLength(rng: Rng): { m: number; cm: number; total: number } {
  const m = rng.int(1, 9);
  const cm = rng.pick([rng.int(1, 9) * 10, rng.int(1, 9), rng.int(1, 9) * 10 + rng.int(1, 9)]);
  return { m, cm, total: m * 100 + cm };
}

const kommaZuCm: Form = (rng, _stufe, ab) => {
  const { m, cm, total } = commaLength(rng);
  const prompt = 'Schreibe in Zentimeter.';
  const expression = `${commaM(total)} = ${BOX}${NBSP}cm`;
  const misread = cm < 10 ? m * 100 + cm * 10 : cm % 10 === 0 ? m * 100 + cm / 10 : null;
  return {
    key: `kommacm:${total}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: total, unit: 'cm', label: 'Länge in Zentimeter' },
    hints: ['Vor dem Komma stehen die Meter. 1 m sind 100 cm.', 'Nach dem Komma stehen die Zentimeter.'],
    steps: [`${qty(m, 'm')} = ${qty(m * 100, 'cm')}`, `Nach dem Komma: ${qty(cm, 'cm')}.`, `${qty(m * 100, 'cm')} + ${qty(cm, 'cm')} = ${qty(total, 'cm')}`],
    bugs: numberBugs(
      [
        misread !== null && { id: 'm-komma', match: misread, hint: `Nach dem Komma stehen die Zentimeter: ${qty(cm, 'cm')}.` },
        { id: 'einheiten-gemischt', match: m + cm, hint: HINT_EINHEITEN },
      ],
      total,
    ),
    praise: cm < 10 ? 'Du hast die 0 nach dem Komma beachtet.' : 'Du hast nach dem Komma die Zentimeter gelesen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const cmZuKomma: Form = (rng, _stufe, ab) => {
  const { m, cm, total } = commaLength(rng);
  const value = total / 100;
  const prompt = 'Schreibe in Meter mit Komma.';
  const expression = `${qty(total, 'cm')} = ${BOX}${NBSP}m`;
  return {
    key: `cmkomma:${total}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, decimals: 2, unit: 'm', label: 'Länge in Meter' },
    hints: ['100 cm sind 1 m.', 'Die Zentimeter stehen nach dem Komma, immer mit 2 Stellen.'],
    steps: [`${qty(m * 100, 'cm')} = ${qty(m, 'm')}`, `${restText(cm, 'cm')}.`, `${qty(total, 'cm')} = ${commaM(total)}`],
    bugs: numberBugs(
      [
        cm < 10 && { id: 'm-komma', match: (m * 100 + cm * 10) / 100, hint: zweiStellenText(cm, 'cm') },
        { id: 'cm-100', match: total / 10, hint: '100 cm sind 1 m.' },
        { id: 'ohne-komma', match: total, hint: 'Setze das Komma. Vor dem Komma stehen die Meter.' },
      ],
      value,
    ),
    praise: 'Du hast aus 100 cm einen Meter gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const kommaZuGemischt: Form = (rng, _stufe, ab) => {
  const { m, cm, total } = commaLength(rng);
  const fields = [{ id: 'm', value: m, after: 'm', label: 'Meter' }, { id: 'cm', value: cm, after: 'cm', label: 'Zentimeter' }];
  const prompt = 'Schreibe ohne Komma.';
  const expression = `${commaM(total)} = ${BOX}${NBSP}m ${BOX}${NBSP}cm`;
  return {
    key: `kommam:${total}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Vor dem Komma stehen die Meter.', 'Nach dem Komma stehen die Zentimeter.'],
    steps: [`Vor dem Komma: ${qty(m, 'm')}.`, `Nach dem Komma: ${qty(cm, 'cm')}.`, `${commaM(total)} = ${fmtLength(total)}`],
    bugs: multiBugs(
      [
        cm < 10 && { id: 'm-komma', match: { m, cm: cm * 10 }, hint: `Nach dem Komma stehen die Zentimeter: ${qty(cm, 'cm')}.` },
        cm >= 10 && cm % 10 === 0 && { id: 'm-komma', match: { m, cm: cm / 10 }, hint: `Nach dem Komma stehen die Zentimeter: ${qty(cm, 'cm')}.` },
      ],
      fields,
    ),
    praise: 'Du hast Meter und Zentimeter am Komma getrennt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

function smallLengths(rng: Rng): OrderItem[] {
  const cm = rng.int(3, 8);
  const inMm = (mm: number): OrderItem => ({ label: qty(mm, 'mm'), value: mm, printed: mm * 10 });
  const mixed = (mm: number): OrderItem => ({ label: mm % 10 === 0 ? qty(mm / 10, 'cm') : mixedMm(mm), value: mm, printed: mm });
  return [mixed(cm * 10 + rng.int(1, 5)), inMm(cm * 10 + rng.int(6, 9)), mixed((cm + 1) * 10), inMm((cm - 1) * 10 + rng.int(1, 9))];
}

function largeLengths(rng: Rng, stufe: Stufe): OrderItem[] {
  const m = rng.int(1, stufe === 3 ? 7 : 3);
  const d = rng.int(2, 9);
  const comma = (cm: number, misread?: number): OrderItem => ({ label: commaM(cm), value: cm, printed: cm, ...(misread !== undefined ? { misread } : {}) });
  const mixed = (cm: number): OrderItem => ({ label: fmtLength(cm), value: cm, printed: cm });
  const inCm = (cm: number): OrderItem => ({ label: qty(cm, 'cm'), value: cm, printed: cm * 100 });
  const base = m * 100;
  return [
    comma(base + d, base + d * 10),
    rng.chance(0.5) ? mixed(base + (d - 1) * 10) : inCm(base + (d - 1) * 10),
    inCm(base + d * 10 + rng.int(1, 5)),
    mixed(base + 100 + rng.int(1, 9) * 5),
    rng.chance(0.5) ? comma(base - rng.int(1, 3) * 10) : inCm(base - rng.int(1, 3) * 10),
  ];
}

const ordnen: Form = (rng, stufe, ab) => {
  // Stufe 1 has no comma with m (§2.2).
  const small = stufe === 1;
  const items = small ? smallLengths(rng) : largeLengths(rng, stufe);
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, shown } = orderItems(rng, items, direction);
  const unit = small ? 'mm' : 'cm';
  const target = answer.correct.map((i) => shown[i]);
  const prompt = `Ordne die Längen. Fang mit der ${direction === 'aufsteigend' ? 'kleinsten' : 'größten'} Länge an.`;
  const trapHint = small ? '' : `Nach dem Komma stehen immer 2 Stellen für die Zentimeter.`;
  return {
    key: `ordnen:${shown.map((x) => x.label).join('|')}:${direction}`,
    ab,
    prompt,
    answer,
    hints: [`Schreibe alle Längen in ${small ? 'Millimeter' : 'Zentimeter'}. Dann kannst du vergleichen.`, small ? '1 cm sind 10 mm.' : '1 m sind 100 cm.'],
    steps: [`Alle Längen in ${small ? 'Millimeter' : 'Zentimeter'}: ${shown.map((x) => qty(x.value, unit)).join(', ')}.`, `Der Größe nach: ${orderChain(target.map((x) => qty(x.value, unit)), direction)}`, ...orderAnswerSteps(target.map((x) => x.label), direction)],
    bugs: orderBugs([
      !small ? orderBug('m-komma', answer, shown, (x) => x.misread ?? x.value, trapHint) : null,
      orderBug('einheit-zahl', answer, shown, (x) => x.printed ?? x.value, 'Schau auf die Einheit. Schreibe alle Längen in der gleichen Einheit.'),
    ]),
    praise: 'Du hast alle Längen in die gleiche Einheit gebracht.',
    srText: orderSr(prompt, shown.map((x) => x.label)),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

export const laengenSkill: SkillDef = {
  ...SKILL,
  title: 'Millimeter, Zentimeter, Meter',
  description: 'Du misst genau und wandelst Längen um.',
  stufen: { 1: 'Am Lineal messen in cm und mm', 2: '1 cm sind 10 mm: Längen umwandeln', 3: 'Längen mit Komma, Längen ordnen' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [messen, messen, messenVerschoben],
    2: [cmMmZuMm, cmZuMm, mmZuCmMm, fromStufe(2, mCmZuCm)],
    3: [fromStufe(2, kommaZuCm), fromStufe(2, cmZuKomma), fromStufe(2, kommaZuGemischt), ordnen],
  }),
};
