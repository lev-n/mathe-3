/**
 * Euro und Cent mit Komma (docs/research.md §6).
 * AB I: 3,40 € = 3 € 40 ct with whole tens of cents, money pictures.
 * AB II: the leading zero (3,05 €), cents to euros and back.
 * AB III: order mixed notations, Stellenwerttafel 10 €, 1 €, 10 ct, 1 ct.
 * The leading zero starts on Stufe 2 (G7): on Stufe 1, AB II and III stay on whole tens of cents.
 */
import { BOX, NBSP, fmtMoney, fmtMoneyMixed } from '../../core/format';
import type { Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { multiBugs, numberBugs, plural } from '../shared';
import { generator, moneyPieces, orderAnswerSteps, orderBug, orderBugs, orderChain, orderItems, orderSr, pieceText, qty, restText, sr, zweiStellenText, type Form, type OrderItem } from './helpers';

const SKILL = { id: 'groessen.geld-komma', topicId: 'groessen' } as const;
const KMK = ['GM.geld', 'GM.einheiten'];

const HINT_EINHEITEN = 'Rechne Euro und Cent getrennt: erst Euro, dann Cent.';

function euroOf(rng: Rng, stufe: Stufe): number {
  return rng.int(1, stufe === 1 ? 9 : stufe === 2 ? 20 : 50);
}

const twoPlaces = (ct: number) => String(ct).padStart(2, '0');

const wholeTens = (rng: Rng) => rng.int(1, 9) * 10;

/** 2 Stellen after the comma, for the ct as they stand in the amount. */
function hintZweiStellen(ct: number): string {
  return `Nach dem Komma stehen 2 Stellen. ${twoPlaces(ct)} heißt ${ct} Cent.`;
}

const kommaZuGemischt: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = ab === 1 || stufe === 1 ? wholeTens(rng) : rng.int(1, 9);
  const money = euro * 100 + ct;
  const fields = [{ id: 'euro', value: euro, after: '€', label: 'Euro' }, { id: 'cent', value: ct, after: 'ct', label: 'Cent' }];
  const prompt = 'Schreibe ohne Komma.';
  const expression = `${fmtMoney(money)} = ${BOX}${NBSP}€ ${BOX}${NBSP}ct`;
  return {
    key: `komma:${money}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Vor dem Komma stehen die Euro.', 'Nach dem Komma stehen die Cent, immer mit 2 Stellen.'],
    steps: [`Vor dem Komma: ${qty(euro, '€')}.`, `Nach dem Komma: ${twoPlaces(ct)} heißt ${qty(ct, 'ct')}.`, `${fmtMoney(money)} = ${fmtMoneyMixed(money)}`],
    bugs: multiBugs([{ id: 'komma-einstellig', match: { euro, cent: ct < 10 ? ct * 10 : ct / 10 }, hint: hintZweiStellen(ct) }], fields),
    praise: ct < 10 ? 'Du hast die 0 nach dem Komma beachtet.' : 'Du hast Euro und Cent am Komma getrennt.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const gemischtZuKomma: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = ab === 1 || stufe === 1 ? wholeTens(rng) : rng.int(1, 9);
  const money = euro * 100 + ct;
  const value = money / 100;
  const prompt = 'Schreibe mit Komma.';
  const expression = `${fmtMoneyMixed(money)} = ${BOX}${NBSP}€`;
  return {
    key: `gemischt:${money}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, decimals: 2, unit: '€', label: 'Betrag in Euro' },
    hints: ['Die Euro stehen vor dem Komma.', 'Die Cent stehen nach dem Komma, immer mit 2 Stellen.'],
    steps: [`${qty(euro, '€')} ${plural(euro, 'steht', 'stehen')} vor dem Komma.`, `${qty(ct, 'ct')} schreibst du nach dem Komma als ${twoPlaces(ct)}.`, `${fmtMoneyMixed(money)} = ${fmtMoney(money)}`],
    bugs: numberBugs(
      [
        { id: 'komma-einstellig', match: (euro * 100 + (ct < 10 ? ct * 10 : ct / 10)) / 100, hint: zweiStellenText(ct, 'ct') },
        { id: 'einheiten-gemischt', match: euro + ct, hint: HINT_EINHEITEN },
        { id: 'ohne-komma', match: money, hint: 'Setze das Komma. Vor dem Komma stehen die Euro.' },
      ],
      value,
    ),
    praise: ct < 10 ? 'Du hast die Cent mit 2 Stellen geschrieben.' : 'Du hast die Cent hinter das Komma geschrieben.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const gemischtZuCent: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = ab === 1 || stufe === 1 ? wholeTens(rng) : rng.int(1, 99);
  const money = euro * 100 + ct;
  const prompt = 'Schreibe alles in Cent.';
  const expression = `${fmtMoneyMixed(money)} = ${BOX}${NBSP}ct`;
  return {
    key: `incent:${money}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: money, unit: 'ct', label: 'Betrag in Cent' },
    hints: ['1 € sind 100 ct.', 'Rechne zuerst die Euro in Cent um. Dann kommen die Cent dazu.'],
    steps: [`${qty(euro, '€')} = ${qty(euro * 100, 'ct')}`, `${qty(euro * 100, 'ct')} + ${qty(ct, 'ct')} = ${qty(money, 'ct')}`],
    bugs: numberBugs(
      [
        { id: 'einheiten-gemischt', match: euro + ct, hint: HINT_EINHEITEN },
        { id: 'cent-anhaengen', match: euro * 1000 + ct, hint: `1 € sind 100 ct. ${qty(euro, '€')} sind also ${qty(euro * 100, 'ct')}.` },
      ],
      money,
    ),
    praise: 'Du hast die Euro zuerst in Cent umgerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

/** The notes and coins in words, as in the aria-label of the picture: only the picture holds these numbers. */
function moneySr(items: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const c of items) counts.set(c, (counts.get(c) ?? 0) + 1);
  const parts = [...counts].map(([c, n]) => `${n} ${c >= 500 ? plural(n, 'Schein', 'Scheine') : plural(n, 'Münze', 'Münzen')} zu ${pieceText(c)}`);
  return `Geld: ${parts.join(', ')}.`;
}

const geldBild: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = rng.int(1, 9) * 10;
  const money = euro * 100 + ct;
  const value = money / 100;
  const prompt = 'Schreibe mit Komma. Wie viel Geld ist das?';
  return {
    key: `bild:${money}`,
    ab,
    prompt,
    visual: { type: 'money', items: moneyPieces(money) },
    answer: { kind: 'number', value, decimals: 2, unit: '€', label: 'Betrag in Euro' },
    hints: ['Rechne zuerst die Scheine und Euro-Münzen zusammen.', 'Rechne dann die Cent-Münzen zusammen. Die Cent stehen nach dem Komma.'],
    steps: [`Scheine und Euro-Münzen: ${qty(euro, '€')}.`, `Cent-Münzen: ${qty(ct, 'ct')}.`, `Zusammen: ${fmtMoney(money)}.`],
    bugs: numberBugs(
      [
        { id: 'komma-einstellig', match: (euro * 100 + ct / 10) / 100, hint: zweiStellenText(ct, 'ct') },
        { id: 'nur-euro', match: euro, hint: 'Rechne auch die Cent-Münzen dazu.' },
      ],
      value,
    ),
    praise: 'Du hast erst die Euro und dann die Cent gezählt.',
    srText: sr(prompt, moneySr(moneyPieces(money))),
    kmk: KMK,
  };
};

const centZuEuro: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = stufe === 1 ? wholeTens(rng) : rng.chance(0.6) ? rng.int(1, 9) : rng.int(1, 9) * 10 + rng.int(0, 9);
  const money = euro * 100 + ct;
  const value = money / 100;
  const prompt = 'Schreibe in Euro mit Komma.';
  const expression = `${qty(money, 'ct')} = ${BOX}${NBSP}€`;
  return {
    key: `ineuro:${money}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, decimals: 2, unit: '€', label: 'Betrag in Euro' },
    hints: ['100 ct sind 1 €.', 'Die letzten 2 Ziffern sind die Cent. Die Cent stehen nach dem Komma.'],
    steps: [`${qty(euro * 100, 'ct')} = ${qty(euro, '€')}`, `${restText(ct, 'ct')}: Das schreibst du als ${twoPlaces(ct)}.`, `${qty(money, 'ct')} = ${fmtMoney(money)}`],
    bugs: numberBugs(
      [
        ct < 10 && { id: 'komma-einstellig', match: (euro * 100 + ct * 10) / 100, hint: hintZweiStellen(ct) },
        { id: 'hundert-cent', match: money / 10, hint: `100 ct sind 1 €. Wie oft passen 100 ct in ${qty(money, 'ct')}?` },
        { id: 'ohne-komma', match: money, hint: 'Setze das Komma. Vor dem Komma stehen die Euro.' },
      ],
      value,
    ),
    praise: 'Du hast 100 ct als 1 € gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const kommaZuCent: Form = (rng, stufe, ab) => {
  const euro = euroOf(rng, stufe);
  const ct = stufe === 1 ? wholeTens(rng) : rng.int(1, 9);
  const money = euro * 100 + ct;
  const prompt = 'Schreibe in Cent.';
  const expression = `${fmtMoney(money)} = ${BOX}${NBSP}ct`;
  return {
    key: `kommacent:${money}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value: money, unit: 'ct', label: 'Betrag in Cent' },
    hints: ['Vor dem Komma stehen die Euro. 1 € sind 100 ct.', 'Nach dem Komma stehen die Cent.'],
    steps: [`${qty(euro, '€')} = ${qty(euro * 100, 'ct')}`, `Nach dem Komma steht ${twoPlaces(ct)}: ${plural(ct, 'Das ist', 'Das sind')} ${qty(ct, 'ct')}.`, `${qty(euro * 100, 'ct')} + ${qty(ct, 'ct')} = ${qty(money, 'ct')}`],
    bugs: numberBugs(
      [
        { id: 'komma-einstellig', match: euro * 100 + (ct < 10 ? ct * 10 : ct / 10), hint: hintZweiStellen(ct) },
        { id: 'einheiten-gemischt', match: euro + ct, hint: HINT_EINHEITEN },
        ct < 10 && { id: 'ohne-null', match: euro * 10 + ct, hint: `Die 0 zählt mit. ${qty(euro, '€')} sind ${qty(euro * 100, 'ct')}.` },
      ],
      money,
    ),
    praise: ct < 10 ? 'Du hast die 0 nach dem Komma mitgelesen.' : 'Du hast die Cent nach dem Komma richtig gelesen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

/** A sum in one of the three notations. */
function moneyItem(money: number, form: 'komma' | 'gemischt' | 'cent'): OrderItem {
  const euro = Math.floor(money / 100);
  const ct = money % 100;
  if (form === 'cent') return { label: qty(money, 'ct'), value: money, printed: money * 100 };
  return { label: form === 'komma' ? fmtMoney(money) : fmtMoneyMixed(money), value: money, printed: euro * 100 + ct };
}

const ordnen: Form = (rng, stufe, ab) => {
  const base = rng.int(2, stufe === 1 ? 7 : 40);
  const d = rng.int(2, 9);
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  // 3,05 € read as 3,50 € is the trap from Stufe 2 on (G7). On Stufe 1 all amounts have whole tens of cents.
  const low = stufe === 1;
  const trap: OrderItem = low ? { label: fmtMoney(base * 100 + d * 10), value: base * 100 + d * 10, printed: base * 100 + d * 10 } : { label: fmtMoney(base * 100 + d), value: base * 100 + d, misread: base * 100 + d * 10, printed: base * 100 + d };
  const money = [base * 100 + (d - 1) * 10, (base + 1) * 100 + (low ? wholeTens(rng) : rng.int(1, 9) * 5), (base - 1) * 100 + rng.int(6, 9) * 10, base * 100 + d * 10 + rng.int(1, 4)];
  // The amount in Cent is the smallest one, so a child who sorts by the printed number gets another order.
  const forms = [rng.pick(['komma', 'gemischt'] as const), rng.pick(['komma', 'gemischt', 'cent'] as const), 'cent' as const, rng.pick(['komma', 'gemischt'] as const)];
  const count = stufe === 1 ? 3 : 4;
  const others = money.slice(0, count).map((m, i) => moneyItem(m, forms[i]));
  const { answer, shown } = orderItems(rng, [trap, ...others], direction);
  const target = answer.correct.map((i) => shown[i]);
  const prompt = `Ordne die Beträge. Fang mit dem ${direction === 'aufsteigend' ? 'kleinsten' : 'größten'} Betrag an.`;
  return {
    key: `ordnen:${[...shown].map((x) => x.label).join('|')}:${direction}`,
    ab,
    prompt,
    answer,
    hints: ['Schreibe alle Beträge in Cent. Dann kannst du vergleichen.', 'Nach dem Komma stehen immer 2 Stellen.'],
    steps: [`Alle Beträge in Cent: ${shown.map((x) => qty(x.value, 'ct')).join(', ')}.`, `Der Größe nach: ${orderChain(target.map((x) => qty(x.value, 'ct')), direction)}`, ...orderAnswerSteps(target.map((x) => x.label), direction)],
    bugs: orderBugs([
      orderBug('komma-einstellig', answer, shown, (x) => x.misread ?? x.value, hintZweiStellen(d)),
      orderBug('cent-als-euro', answer, shown, (x) => x.printed ?? x.value, 'Schau auf die Einheit. 100 ct sind nur 1 €.'),
    ]),
    praise: 'Du hast alle Beträge in die gleiche Einheit gebracht.',
    srText: orderSr(prompt, shown.map((x) => x.label)),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

function tafel(values: (number | null)[]): Visual {
  return { type: 'placeValue', columns: ['T', 'H', 'Z', 'E'], headers: ['10 €', '1 €', '10 ct', '1 ct'], rows: [{ values }] };
}

function tafelBetrag(rng: Rng, stufe: Stufe): number {
  const euro = stufe === 1 ? rng.int(1, 9) : rng.int(11, 59);
  if (stufe === 1) return euro * 100 + wholeTens(rng);
  return euro * 100 + (rng.chance(0.5) ? rng.int(1, 9) : rng.int(1, 9) * 10 + rng.int(1, 9));
}

const digitsOf = (money: number) => [Math.floor(money / 1000), Math.floor(money / 100) % 10, Math.floor(money / 10) % 10, money % 10];

const tafelLesen: Form = (rng, stufe, ab) => {
  const money = tafelBetrag(rng, stufe);
  const [a, b, c, d] = digitsOf(money);
  const value = money / 100;
  const prompt = 'Schreibe mit Komma. Welcher Betrag steht in der Tafel?';
  return {
    key: `tafel:${money}`,
    ab,
    prompt,
    visual: tafel([a, b, c, d]),
    answer: { kind: 'number', value, decimals: 2, unit: '€', label: 'Betrag in Euro' },
    hints: ['Die Spalten mit € stehen vor dem Komma.', 'Die Spalten mit ct stehen nach dem Komma.'],
    steps: [`${a} · 10 € + ${b} · 1 € = ${qty(a * 10 + b, '€')}`, `${c} · 10 ct + ${d} · 1 ct = ${qty(c * 10 + d, 'ct')}`, `Zusammen: ${fmtMoney(money)}`],
    bugs: numberBugs(
      [
        c === 0 && { id: 'komma-einstellig', match: (a * 1000 + b * 100 + d * 10) / 100, hint: hintZweiStellen(d) },
        { id: 'ohne-komma', match: money, hint: 'Setze das Komma. Vor dem Komma stehen die Euro.' },
      ],
      value,
    ),
    praise: 'Du hast jede Spalte der Tafel richtig gelesen.',
    srText: sr(prompt, `Stellenwerttafel. 10 €: ${a}, 1 €: ${b}, 10 ct: ${c}, 1 ct: ${d}.`),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const tafelSchreiben: Form = (rng, stufe, ab) => {
  const money = tafelBetrag(rng, stufe);
  const [a, b, c, d] = digitsOf(money);
  const fields = [
    { id: 'zehnEuro', value: a, before: '10 €:', label: 'Spalte 10 Euro' },
    { id: 'einEuro', value: b, before: '1 €:', label: 'Spalte 1 Euro' },
    { id: 'zehnCent', value: c, before: '10 ct:', label: 'Spalte 10 Cent' },
    { id: 'einCent', value: d, before: '1 ct:', label: 'Spalte 1 Cent' },
  ];
  const prompt = 'Trage den Betrag in die Tafel ein.';
  const expression = fmtMoney(money);
  return {
    key: `tafelfuellen:${money}`,
    ab,
    prompt,
    expression,
    visual: tafel([null, null, null, null]),
    answer: { kind: 'multi', fields },
    hints: ['Vor dem Komma stehen die Spalten mit €.', 'Nach dem Komma stehen die Spalten mit ct.'],
    steps: [`${fmtMoney(money)} = ${a} · 10 € + ${b} · 1 € + ${c} · 10 ct + ${d} · 1 ct`, `In der Tafel: ${a}, ${b}, ${c}, ${d}`],
    bugs: multiBugs(
      [
        c === 0 && { id: 'komma-einstellig', match: { zehnEuro: a, einEuro: b, zehnCent: d, einCent: 0 }, hint: hintZweiStellen(d) },
        a === 0 && { id: 'tafel-verrutscht', match: { zehnEuro: b, einEuro: c, zehnCent: d, einCent: 0 }, hint: 'Die Euro stehen vor dem Komma. Die letzte Ziffer gehört zu 1 ct.' },
      ],
      fields,
    ),
    praise: 'Du hast jede Ziffer in die richtige Spalte gesetzt.',
    srText: sr(prompt, expression),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

export const geldKommaSkill: SkillDef = {
  ...SKILL,
  title: 'Euro und Cent mit Komma',
  description: 'Du schreibst Geldbeträge mit Komma und ohne Komma.',
  stufen: { 1: 'Beträge mit ganzen Zehnern bei den Cent', 2: 'Beträge mit einer 0 nach dem Komma', 3: 'Beträge ordnen und in die Tafel schreiben' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [kommaZuGemischt, gemischtZuKomma, gemischtZuCent, geldBild],
    2: [kommaZuGemischt, gemischtZuKomma, gemischtZuCent, centZuEuro, kommaZuCent],
    3: [ordnen, tafelLesen, tafelSchreiben],
  }),
};
