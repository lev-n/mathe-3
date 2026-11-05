/**
 * Tabellen lesen (docs/research.md §6).
 * Stufe 1: one value, up to 5 rows, values up to 100. Stufe 2: two columns, compare and total.
 * Stufe 3: the value is not shown directly, or the table cannot answer the question ("Nicht lösbar").
 */
import type { Ab, Exercise, NumberAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { BOX } from '../../core/format';
import { bugList, build, makeChoice, numberBugs, targetAb } from '../shared';
import { CARD_PX, cap, distinctValues, oneColumnTable, pickCats, say, SMALL_THEMES, sum, type Cat, type Theme } from './helpers';

const SKILL = { id: 'daten.tabelle', topicId: 'daten' } as const;
const KMK = ['DZ.daten'];

/** Stufe 3 always offers the button, so that the button itself does not give a task away. */
const numberAnswer = (value: number | null, unit: string, stufe: Stufe): NumberAnswer => ({
  kind: 'number',
  value,
  unit,
  label: 'Anzahl',
  ...(stufe === 3 ? { offerUnsolvable: true } : {}),
});

const HINT_MINUS = 'Rechne die größere Zahl minus die kleinere Zahl.';
const HINT_FIND = 'Such zuerst beide Zahlen in der Tabelle.';
const BUG_UNTERSCHIED = 'Gefragt ist der Unterschied: Wie viele sind es mehr?';
const BUG_PLUS = 'Hier geht es um den Unterschied. Rechne minus.';

interface Two {
  theme: Theme;
  cats: Cat[];
  /** rows[row][column] */
  rows: number[][];
  visual: VisualOf<'table'>;
}

/** A difference of 1 would need the singular, also in the unit of the answer. Differences start at 2. */
const MIN_DIFFERENCE = 2;

/** Two values of a row that are at least MIN_DIFFERENCE apart. */
function rowValues(rng: Rng): number[] {
  let row = distinctValues(rng, 2, 4, 60);
  while (Math.abs(row[0] - row[1]) < MIN_DIFFERENCE) row = distinctValues(rng, 2, 4, 60);
  return row;
}

/**
 * Longest row label beside 2 value columns on a 375 px phone. Same estimate as tableFloor in testUtils.ts: 13.5 px per letter,
 * 34 px padding and border per column, 16 px spare (measured in Chrome: 'Schwimmen' beside 'Ost' and 'Süd' is 9 px too wide).
 */
function rowLabelRoom(theme: Theme): number {
  const letters = Math.max(2, theme.cols[0].label.length, theme.cols[1].label.length);
  return Math.floor((CARD_PX - 16 - 34 - 2 * (letters * 13.5 + 34)) / 13.5);
}

/** A table with two value columns. The heads are short, so the caption says them in full. */
function twoColumns(rng: Rng, nRows: number): Two {
  const theme = rng.pick(SMALL_THEMES);
  const cats = pickCats(rng, theme, nRows, rowLabelRoom(theme));
  const rows = cats.map(() => rowValues(rng));
  const visual: VisualOf<'table'> = {
    type: 'table',
    caption: `${theme.title}: ${theme.cols[0].at} und ${theme.cols[1].at}`,
    header: [theme.head, theme.cols[0].label, theme.cols[1].label],
    rows: cats.map((c, i) => [c.label, String(rows[i][0]), String(rows[i][1])]),
  };
  return { theme, cats, rows, visual };
}

const keyOf = (form: string, theme: Theme, ...parts: (string | number)[]) => [form, theme.id, ...parts].join(':');

// ─── Forms ───────────────────────────────────────────────────────────────────

/** Stufe 1: one value from a table with up to 5 rows. */
function readOne(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const n = rng.int(3, 5);
  const cats = pickCats(rng, theme, n);
  const values = distinctValues(rng, n, 5, 50);
  const i = rng.int(0, n - 1);
  const value = values[i];
  const prompt = theme.ask(cats[i]);
  return build(SKILL, stufe, {
    key: keyOf('wert', theme, cats[i].label, values.join('-')),
    ab,
    prompt,
    visual: oneColumnTable(theme, cats, values),
    answer: numberAnswer(value, theme.unit, stufe),
    hints: [`Such die Zeile ${cats[i].label}.`, 'Geh in dieser Zeile nach rechts bis zur Zahl.'],
    steps: [`Such die Zeile ${cats[i].label}.`, `In dieser Zeile steht ${value}.`, `Es sind ${value} ${theme.unit}.`],
    bugs: bugList(value, [['andere-zeile', values[(i + 1) % n], `Das ist eine andere Zeile. Such die Zeile ${cats[i].label}.`]]),
    praise: 'Du hast die richtige Zeile gefunden.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 1: from a number to its row, or the largest and the smallest number. */
function findRow(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const n = 4;
  const cats = pickCats(rng, theme, n);
  const values = distinctValues(rng, n, 5, 50);
  const form = rng.pick(['zahl', 'groesste', 'kleinste'] as const);
  const target = form === 'zahl' ? rng.int(0, n - 1) : values.indexOf(form === 'groesste' ? Math.max(...values) : Math.min(...values));
  const prompt = form === 'zahl' ? `In welcher Zeile steht die Zahl ${values[target]}?` : `In welcher Zeile steht die ${form === 'groesste' ? 'größte' : 'kleinste'} Zahl?`;
  const why = (i: number) => `${cap(cats[i].at)} steht ${values[i]}. ${form === 'zahl' ? `Such die ${values[target]}.` : 'Vergleiche alle Zahlen.'}`;
  return build(SKILL, stufe, {
    key: keyOf(form, theme, cats[target].label, values.join('-')),
    ab,
    prompt,
    visual: oneColumnTable(theme, cats, values),
    answer: makeChoice(rng, { label: cats[target].label }, cats.flatMap((c, i) => (i === target ? [] : [{ label: c.label, whyWrong: why(i) }]))),
    hints: form === 'zahl' ? [`Geh die Spalte ${theme.unit} von oben nach unten durch.`, 'Schau dann in der Zeile nach links.'] : ['Vergleiche zuerst die Zehner.', 'Sind die Zehner gleich, vergleiche die Einer.'],
    steps: [`Vergleiche die Zahlen: ${values.join(', ')}.`, `${cap(cats[target].at)} steht ${values[target]}.`, `Die Zeile heißt ${cats[target].label}.`],
    praise: form === 'zahl' ? 'Du hast die Zahl in der Spalte gefunden.' : 'Du hast alle Zahlen verglichen.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** How many more: two numbers of one column or of one row. */
function difference(stufe: Stufe, ab: Ab, big: number, small: number, theme: Theme, visual: VisualOf<'table'>, context: string | undefined, prompt: string, key: string): Exercise {
  const d = big - small;
  return build(SKILL, stufe, {
    key,
    ab,
    ...(context ? { context } : {}),
    prompt,
    visual,
    answer: numberAnswer(d, theme.unit, stufe),
    hints: [HINT_FIND, HINT_MINUS],
    steps: [`In der Tabelle stehen ${big} und ${small}.`, `${big} − ${small} = ${d}`, `Es sind ${d} ${theme.unit} mehr.`],
    bugs: bugList(d, [['mehr-unterschied', big, BUG_UNTERSCHIED], ['plus-statt-minus', big + small, BUG_PLUS]]),
    praise: 'Du hast den Unterschied ausgerechnet.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 1, harder item: two rows of a table with one column. */
function twoRows(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const n = rng.int(3, 5);
  const cats = pickCats(rng, theme, n);
  const values = distinctValues(rng, n, 5, 50);
  const [p, q] = rng.sample(cats.map((_, i) => i), 2);
  const [hi, lo] = values[p] > values[q] ? [p, q] : [q, p];
  const visual = oneColumnTable(theme, cats, values);
  if (rng.chance(0.5) && Math.abs(values[p] - values[q]) >= MIN_DIFFERENCE) {
    const prompt = `Wie viele ${theme.unit} sind es ${cats[hi].at} mehr als ${cats[lo].at}?`;
    return difference(stufe, ab, values[hi], values[lo], theme, visual, undefined, prompt, keyOf('mehr', theme, cats[hi].label, cats[lo].label, values.join('-')));
  }
  const total = values[p] + values[q];
  const prompt = `Wie viele ${theme.unit} sind es ${cats[p].at} und ${cats[q].at} zusammen?`;
  return build(SKILL, stufe, {
    key: keyOf('zusammen', theme, cats[p].label, cats[q].label, values.join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(total, theme.unit, stufe),
    hints: [HINT_FIND, 'Zusammen heißt hier: Rechne beide Zahlen plus.'],
    steps: [`${cap(cats[p].at)} steht ${values[p]}.`, `${cap(cats[q].at)} steht ${values[q]}.`, `${values[p]} + ${values[q]} = ${total}`],
    bugs: bugList(total, [
      ['minus-statt-plus', Math.abs(values[p] - values[q]), 'Gefragt ist: Wie viele sind es zusammen?'],
      ['nur-ein-wert', values[p], 'Du brauchst beide Zahlen aus der Tabelle.'],
    ]),
    praise: 'Du hast die Zahlen beider Zeilen plus gerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 2: one cell of a table with two columns. */
function readCell(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, rows, visual } = twoColumns(rng, rng.int(3, 4));
  const r = rng.int(0, cats.length - 1);
  const c = rng.int(0, 1);
  const value = rows[r][c];
  const col = theme.cols[c];
  const prompt = theme.ask(cats[r], ` ${col.at}`);
  return build(SKILL, stufe, {
    key: keyOf('zelle', theme, cats[r].label, c, rows.flat().join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(value, theme.unit, stufe),
    hints: [`Such zuerst die Zeile ${cats[r].label}.`, `Such dann die Spalte ${col.label}.`],
    steps: [`Zeile: ${cats[r].label}.`, `Spalte: ${col.label}.`, `Dort steht ${value}.`],
    bugs: bugList(value, [
      ['andere-spalte', rows[r][1 - c], `Das ist die andere Spalte. Schau in die Spalte ${col.label}.`],
      ['andere-zeile', rows[(r + 1) % cats.length][c], `Das ist eine andere Zeile. Such die Zeile ${cats[r].label}.`],
    ]),
    praise: 'Du hast Zeile und Spalte zusammen gelesen.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 2: compare in a column or in a row, or the total of a row. */
function compareTwo(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, rows, visual } = twoColumns(rng, rng.int(3, 4));
  const form = rng.pick(['spalte', 'zeile', 'summe'] as const);
  const r = rng.int(0, cats.length - 1);
  if (form === 'zeile') {
    const hi = rows[r][0] > rows[r][1] ? 0 : 1;
    const context = `Lies die Zeile ${cats[r].label}.`;
    const prompt = `Wie viele sind ${theme.cols[hi].at} mehr als ${theme.cols[1 - hi].at}?`;
    return difference(stufe, ab, rows[r][hi], rows[r][1 - hi], theme, visual, context, prompt, keyOf('zeile', theme, cats[r].label, rows.flat().join('-')));
  }
  if (form === 'spalte') {
    const c = rng.int(0, 1);
    const [p, q] = rng.sample(cats.map((_, i) => i), 2);
    const [hi, lo] = rows[p][c] >= rows[q][c] ? [p, q] : [q, p];
    const context = `Lies die Spalte ${theme.cols[c].label}.`;
    const prompt = `Wie viele sind es ${cats[hi].at} mehr als ${cats[lo].at}?`;
    if (rows[hi][c] - rows[lo][c] >= MIN_DIFFERENCE) return difference(stufe, ab, rows[hi][c], rows[lo][c], theme, visual, context, prompt, keyOf('spalte', theme, cats[hi].label, cats[lo].label, c, rows.flat().join('-')));
  }
  const [a, b] = rows[r];
  const total = a + b;
  const prompt = `Wie viele ${theme.unit} sind es ${cats[r].at} in beiden Spalten zusammen?`;
  return build(SKILL, stufe, {
    key: keyOf('zeilensumme', theme, cats[r].label, rows.flat().join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(total, theme.unit, stufe),
    hints: [`Such die Zeile ${cats[r].label}.`, 'Rechne beide Zahlen dieser Zeile plus.'],
    steps: [`In der Zeile ${cats[r].label} stehen ${a} und ${b}.`, `${a} + ${b} = ${total}`, `Es sind ${total} ${theme.unit}.`],
    bugs: bugList(total, [
      ['minus-statt-plus', Math.abs(a - b), 'Gefragt ist: Wie viele sind es zusammen?'],
      ['nur-ein-wert', a, 'Du brauchst beide Zahlen aus der Zeile.'],
    ]),
    praise: 'Du hast die Zahlen beider Spalten plus gerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, harder item: the total of a whole column, or which column has more. */
function columnTotal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, rows, visual } = twoColumns(rng, rng.int(3, 4));
  const totals = [sum(rows.map((r) => r[0])), sum(rows.map((r) => r[1]))];
  if (totals[0] !== totals[1] && rng.chance(0.35)) {
    const hi = totals[0] > totals[1] ? 0 : 1;
    const prompt = 'Welche Spalte hat zusammen die größere Zahl?';
    return build(SKILL, stufe, {
      key: keyOf('spaltenvergleich', theme, rows.flat().join('-')),
      ab,
      prompt,
      visual,
      answer: makeChoice(rng, { label: theme.cols[hi].label }, [{ label: theme.cols[1 - hi].label, whyWrong: 'Rechne jede Spalte einzeln zusammen. Vergleiche dann die Ergebnisse.' }]),
      hints: ['Rechne zuerst die eine Spalte zusammen.', 'Rechne dann die andere Spalte zusammen und vergleiche.'],
      steps: [`${theme.cols[0].label}: ${rows.map((r) => r[0]).join(' + ')} = ${totals[0]}`, `${theme.cols[1].label}: ${rows.map((r) => r[1]).join(' + ')} = ${totals[1]}`, `Die Spalte ${theme.cols[hi].label} hat zusammen mehr.`],
      praise: 'Du hast beide Spalten ausgerechnet und verglichen.',
      srText: say(prompt),
      kmk: KMK,
    });
  }
  const c = rng.int(0, 1);
  const col = rows.map((r) => r[c]);
  const total = totals[c];
  const prompt = `Wie viele ${theme.unit} sind es ${theme.cols[c].at} zusammen?`;
  return build(SKILL, stufe, {
    key: keyOf('spaltensumme', theme, c, rows.flat().join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(total, theme.unit, stufe),
    hints: [`Such die Spalte ${theme.cols[c].label}.`, 'Rechne alle Zahlen dieser Spalte plus.'],
    steps: [`In der Spalte ${theme.cols[c].label} stehen ${col.join(', ')}.`, `${col.join(' + ')} = ${total}`, `Es sind ${total} ${theme.unit}.`],
    bugs: bugList(total, [
      ['wert-vergessen', total - col[col.length - 1], 'Prüfe: Hast du jede Zeile der Spalte mitgerechnet?'],
      ['andere-spalte', totals[1 - c], `Das ist die andere Spalte. Schau in die Spalte ${theme.cols[c].label}.`],
    ]),
    praise: 'Du hast jede Zeile der Spalte mitgerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/**
 * Stufe 3: an empty field above a total: the value is not shown directly. The parts and the total stand in rows of one
 * category: a total column next to several categories is wider than the card on a phone, and it is what solves the task.
 */
function missingField(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const theme = rng.pick(SMALL_THEMES);
  const [category] = pickCats(rng, theme, 1);
  const parts = rowValues(rng);
  const c = rng.int(0, 1);
  const value = parts[c];
  const other = parts[1 - c];
  const total = value + other;
  const shown: VisualOf<'table'> = {
    type: 'table',
    caption: `${theme.title}: ${category.label}`,
    header: [theme.colHead, theme.unit],
    rows: [[theme.cols[0].label, c === 0 ? BOX : String(parts[0])], [theme.cols[1].label, c === 1 ? BOX : String(parts[1])], ['zusammen', String(total)]],
  };
  const context = `${cap(category.at)} fehlt eine Zahl.`;
  const prompt = 'Welche Zahl gehört in das leere Feld?';
  return build(SKILL, stufe, {
    key: keyOf('luecke', theme, category.label, c, parts.join('-')),
    ab,
    context,
    prompt,
    visual: shown,
    answer: numberAnswer(value, theme.unit, stufe),
    hints: ['In der letzten Zeile steht das Ganze.', 'Das Ganze minus den bekannten Teil ergibt den fehlenden Teil.'],
    steps: [`Zusammen sind es ${total}.`, `Ein Teil ist ${other}.`, `${total} − ${other} = ${value}`],
    bugs: bugList(value, [
      ['gesamt-gelesen', total, 'Das ist die Zahl aus der Zeile zusammen. Gesucht ist ein Teil davon.'],
      ['plus-statt-minus', total + other, 'Das Ganze ist schon da. Rechne minus.'],
    ]),
    praise: 'Du hast den fehlenden Teil aus dem Ganzen ausgerechnet.',
    srText: say(context, prompt),
    kmk: KMK,
  });
}

/** Stufe 3: all cells together: this total stands nowhere in the table. */
function grandTotal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, rows, visual } = twoColumns(rng, 3);
  const totals = [sum(rows.map((r) => r[0])), sum(rows.map((r) => r[1]))];
  const total = totals[0] + totals[1];
  const prompt = `Wie viele ${theme.unit} sind es in der ganzen Tabelle?`;
  return build(SKILL, stufe, {
    key: keyOf('alle', theme, rows.flat().join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(total, theme.unit, stufe),
    hints: ['Rechne zuerst jede Spalte zusammen.', 'Rechne dann beide Ergebnisse plus.'],
    steps: [`${theme.cols[0].label}: ${rows.map((r) => r[0]).join(' + ')} = ${totals[0]}`, `${theme.cols[1].label}: ${rows.map((r) => r[1]).join(' + ')} = ${totals[1]}`, `${totals[0]} + ${totals[1]} = ${total}`],
    bugs: bugList(total, [
      ['spalte-vergessen', totals[0], 'Das ist nur eine Spalte. Gefragt ist die ganze Tabelle.'],
      ['spalte-vergessen-2', totals[1], 'Das ist nur eine Spalte. Gefragt ist die ganze Tabelle.'],
    ]),
    praise: 'Du hast zuerst jede Spalte einzeln gerechnet.',
    srText: say(prompt),
    kmk: KMK,
  });
}

/** Stufe 3: a question about a column the table does not have. */
function notAnswerable(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { theme, cats, rows, visual } = twoColumns(rng, rng.int(3, 4));
  const r = rng.int(0, cats.length - 1);
  const [colA, colB, missing] = theme.cols;
  const prompt = theme.ask(cats[r], ` ${missing.at}`);
  if (rng.chance(0.5)) {
    const choicePrompt = 'Welche Frage kann die Tabelle nicht beantworten?';
    const r2 = (r + 1) % cats.length;
    return build(SKILL, stufe, {
      key: keyOf('frage', theme, cats[r].label, rows.flat().join('-')),
      ab,
      prompt: choicePrompt,
      visual,
      answer: makeChoice(rng, { label: prompt }, [
        { label: theme.ask(cats[r], ` ${colA.at}`), whyWrong: 'Diese Zahl steht in der Tabelle.' },
        { label: theme.ask(cats[r2], ` ${colB.at}`), whyWrong: 'Diese Zahl steht in der Tabelle.' },
        { label: `Wie viele ${theme.unit} sind es ${colA.at} zusammen?`, whyWrong: 'Das kannst du aus der Spalte ausrechnen.' },
      ]),
      hints: ['Schau in die Kopfzeile: Welche Spalten gibt es?', 'Prüfe jede Frage: Findest du die Zahlen dazu?'],
      steps: [`Die Tabelle hat nur die Spalten ${colA.label} und ${colB.label}.`, `Die Spalte ${missing.label} gibt es nicht.`, `Diese Frage bleibt offen: ${prompt}`],
      praise: 'Du hast jede Frage an der Tabelle geprüft.',
      srText: say(choicePrompt),
      kmk: ['DZ.daten', 'PK.argumentieren'],
    });
  }
  return build(SKILL, stufe, {
    key: keyOf('nicht-loesbar', theme, cats[r].label, rows.flat().join('-')),
    ab,
    prompt,
    visual,
    answer: numberAnswer(null, theme.unit, stufe),
    hints: ['Schau in die Kopfzeile: Welche Spalten gibt es?', 'Steht die gesuchte Zahl in der Tabelle?'],
    steps: [`Die Tabelle hat nur die Spalten ${colA.label} und ${colB.label}.`, `Die Spalte ${missing.label} gibt es nicht.`, 'Die Frage ist nicht lösbar.'],
    bugs: numberBugs([
      { id: 'angabe-fehlt', match: rows[r][0], hint: 'Das ist eine andere Spalte. Gibt es die gefragte Spalte?' },
      { id: 'angabe-fehlt', match: rows[r][1], hint: 'Das ist eine andere Spalte. Gibt es die gefragte Spalte?' },
      { id: 'angabe-fehlt', match: rows[r][0] + rows[r][1], hint: 'Plus rechnen hilft hier nicht. Gibt es die gefragte Spalte?' },
    ], null),
    praise: 'Du hast gemerkt: Diese Angabe fehlt in der Tabelle.',
    srText: say(prompt),
    kmk: ['DZ.daten', 'PK.argumentieren'],
  });
}

export const tabelleSkill: SkillDef = {
  ...SKILL,
  title: 'Tabellen lesen',
  description: 'Du findest Zahlen in einer Tabelle und rechnest damit.',
  stufen: { 1: 'Eine Zahl in der Tabelle finden', 2: 'Vergleichen und plus rechnen, 2 Spalten', 3: 'Fehlende Zahlen, offene Fragen' },
  kmk: ['DZ.daten', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? readOne(rng, stufe, ab) : ab === 2 ? findRow(rng, stufe, ab) : twoRows(rng, stufe, ab);
    if (stufe === 2) return ab === 1 ? readCell(rng, stufe, ab) : ab === 2 ? compareTwo(rng, stufe, ab) : columnTotal(rng, stufe, ab);
    if (ab === 1) return compareTwo(rng, stufe, ab);
    if (ab === 2) return rng.chance(0.6) ? missingField(rng, stufe, ab) : grandTotal(rng, stufe, ab);
    return rng.chance(0.75) ? notAnswerable(rng, stufe, ab) : missingField(rng, stufe, ab);
  },
};
