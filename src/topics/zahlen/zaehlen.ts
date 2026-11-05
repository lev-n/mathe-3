/**
 * zahlen.zaehlen: counting forwards and backwards in steps, also across a hundred (docs/research.md §6). A row of numbers with gaps,
 * A and B, in two fields. Crossing a hundred is where the bugs zaehlen-hunderter and zehner-ueber-hundert apply.
 */
import type { Ab, Bug, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, multiBugs, numberBugs } from '../shared';
import { ausFormen, strahl, type Form, type Formen } from './stellen';

const SKILL = { id: 'zahlen.zaehlen', topicId: 'zahlen' } as const;
const KMK = ['ZO.zahlraum', 'MS.muster'];

/** The row: `zahlen[i]` in reading order, step > 0, `richtung` +1 forwards or −1 backwards. */
interface Reihe {
  zahlen: number[];
  luecken: number[];
  step: number;
  richtung: 1 | -1;
}

const reihe = (start: number, step: number, richtung: 1 | -1, n: number) => Array.from({ length: n }, (_, i) => start + i * step * richtung);
const buchstabe = (i: number) => 'AB'[i];
const hundert = (n: number) => Math.floor(n / 100);

/** The step a child slips to, for each step of a row. */
const ANDERER_SCHRITT: Readonly<Record<number, number>> = { 1: 10, 10: 1, 25: 20, 50: 40, 100: 10 };

/**
 * The picture of the row: the shown numbers carry labels, the gaps an arrow with their letter. The accessible name of a line says its ends,
 * so with a gap at the end of the row the line runs one step further and does not name the answer.
 */
function bild(r: Reihe, mitLoesung = false) {
  const amEnde = !mitLoesung && r.luecken.includes(r.zahlen.length - 1) ? r.step : 0;
  const min = Math.min(...r.zahlen) - (r.richtung < 0 ? amEnde : 0);
  const max = Math.max(...r.zahlen) + (r.richtung > 0 ? amEnde : 0);
  const shown = r.zahlen.filter((_, i) => !r.luecken.includes(i));
  const prev = r.zahlen[r.luecken[0] - 1];
  const next = r.zahlen[r.luecken[0]];
  return strahl(min, max, r.step, r.step, false, {
    labels: mitLoesung ? r.zahlen : shown,
    ...(mitLoesung ? { jumps: [{ from: prev, to: next, label: `${r.richtung > 0 ? '+' : '−'} ${r.step}` }] } : { marks: r.luecken.map((l, i) => ({ value: r.zahlen[l], label: buchstabe(i) })) }),
  });
}

const zeile = (r: Reihe) => r.zahlen.map((n, i) => (r.luecken.includes(i) ? buchstabe(r.luecken.indexOf(i)) : String(n))).join(', ');

/** The bugs of the first gap, with the step and the way across a hundred. */
function reihenBugs(r: Reihe): Bug[] {
  const i = r.luecken[0];
  const prev = r.zahlen[i - 1];
  const a = r.zahlen[i];
  const out: Bug[] = [];
  out.push({ id: 'schritt-falsch', match: { a: prev + r.richtung * ANDERER_SCHRITT[r.step] }, hint: `Geh genau ${r.step} ${r.richtung > 0 ? 'weiter' : 'zurück'}.` });
  out.push({ id: 'richtung', match: { a: prev - r.richtung * r.step }, hint: r.richtung > 0 ? 'Die Zahlen werden größer. Zähle vorwärts.' : 'Die Zahlen werden kleiner. Zähle rückwärts.' });
  if (hundert(prev) !== hundert(a) && r.step < 100) {
    if (r.step === 1) {
      const hint = r.richtung > 0 ? `Nach ${prev} ist der Hunderter voll. Es geht mit dem nächsten Hunderter weiter.` : 'Rückwärts wird der Hunderter kleiner. Dann stehen dort 2 Neunen.';
      out.push({ id: 'zaehlen-hunderter', match: { a: a - r.richtung * 100 }, hint });
      if (r.richtung > 0) out.push({ id: 'zaehlen-hunderter', match: { a: Number(`${hundert(prev)}100`) }, hint });
    } else {
      out.push({ id: 'zehner-ueber-hundert', match: { a: a - r.richtung * 100 }, hint: r.richtung > 0 ? 'Hier wird der Hunderter voll. Der Hunderter wird 1 größer.' : 'Hier reichen die Zehner nicht. Der Hunderter wird 1 kleiner.' });
    }
  }
  return out;
}

/** One step past a gap at the end would leave the Zahlenraum: such a row keeps its last number shown. */
function imZahlenraum(r: Reihe): Reihe {
  const letzte = r.zahlen.length - 1;
  return r.richtung > 0 && r.luecken.includes(letzte) && r.zahlen[letzte] + r.step > 1000 ? { ...r, luecken: [letzte - 2, letzte - 1] } : r;
}

function reihenAufgabe(gewuenscht: Reihe, stufe: Stufe, ab: Ab): Exercise {
  const r = imZahlenraum(gewuenscht);
  const fields: MultiField[] = r.luecken.map((l, i) => ({ id: 'ab'[i], value: r.zahlen[l], before: `${buchstabe(i)} =`, label: `Lücke ${buchstabe(i)}` }));
  const wohin = r.richtung > 0 ? 'weiter' : 'zurück';
  const prompt = `Zähle immer ${r.step} ${wohin}.`;
  const prev = r.zahlen[r.luecken[0] - 1];
  const zeichen = r.richtung > 0 ? '+' : '−';
  const rechnung = (i: number) => `${r.zahlen[r.luecken[i] - 1]} ${zeichen} ${r.step} = ${r.zahlen[r.luecken[i]]}`;
  const ueber = r.luecken.some((l) => hundert(r.zahlen[l - 1]) !== hundert(r.zahlen[l])) && r.step < 100;
  return build(SKILL, stufe, {
    key: `reihe:${zeile(r)}`,
    ab,
    prompt,
    expression: zeile(r),
    visual: bild(r),
    answer: { kind: 'multi', fields },
    hints: [`Rechne ab ${prev}: ${prev} ${zeichen} ${r.step}.`, ueber ? 'Achte auf den Hunderter: Hier ändert sich die Ziffer.' : 'Rechne immer von der Zahl davor weiter.'],
    steps: [...r.luecken.map((_, i) => rechnung(i)), { text: fields.map((f) => `${f.before} ${f.value}`).join(' und '), visual: bild(r, true) }],
    bugs: multiBugs(reihenBugs(r), fields),
    praise: ueber ? 'Du hast beim Zählen an den Hunderter gedacht.' : `Du bist immer ${r.step} ${wohin}gegangen.`,
    srText: `${prompt} ${zeile(r)}.`,
    kmk: KMK,
  });
}

type Richtung = 1 | -1;
const beide: Richtung[] = [1, 1, -1];

// ─── Stufe 1: steps of 10 and 100 from a multiple, inside a hundred ──────────

const vielfache = (richtungen: readonly Richtung[], lueckenWahl: readonly number[][]): Form => (rng, stufe, ab) => {
  const richtung = rng.pick(richtungen);
  const luecken = rng.pick(lueckenWahl);
  if (rng.chance(0.5)) {
    const start = richtung > 0 ? rng.int(1, 6) * 100 : rng.int(5, 10) * 100;
    return reihenAufgabe({ zahlen: reihe(start, 100, richtung, 5), luecken, step: 100, richtung }, stufe, ab);
  }
  const h = rng.int(1, 9) * 100;
  const start = h + (richtung > 0 ? rng.int(0, 5) : rng.int(4, 9)) * 10;
  return reihenAufgabe({ zahlen: reihe(start, 10, richtung, 5), luecken, step: 10, richtung }, stufe, ab);
};

/** From one multiple to another, in steps of 100 or of 10 inside a hundred: how many steps? */
function wieVieleSchritte(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const step = rng.pick([100, 10]);
  const k = rng.int(3, 6);
  const start = step === 100 ? rng.int(1, 9 - k) * 100 : rng.int(1, 9) * 100 + rng.int(0, 9 - k) * 10;
  const ziel = start + k * step;
  const zahlen = reihe(start, step, 1, k + 1);
  const prompt = `Zähle von ${start} bis ${ziel}. Immer ${step} weiter. Wie viele Schritte sind es?`;
  return build(SKILL, stufe, {
    key: `schritte:${start}:${ziel}`,
    ab,
    prompt,
    answer: { kind: 'number', value: k, unit: 'Schritte', label: 'Schritte' },
    hints: [`Geh von ${start} aus immer ${step} weiter.`, 'Zähle die Sprünge, nicht die Zahlen.'],
    steps: [`Die Zahlen: ${zahlen.join(', ')}.`, { text: `Das sind ${k} Schritte.`, visual: strahl(start, ziel, step, step, false, { labels: zahlen, jumps: zahlen.slice(1).map((to, i) => ({ from: zahlen[i], to })) }) }],
    bugs: numberBugs(
      [
        { id: 'schritt-falsch', match: k + 1, hint: 'Zähle die Sprünge, nicht die Zahlen.' },
        { id: 'schritt-falsch', match: (ziel - start) / (step / 10), hint: `Jeder Schritt ist ${step} groß.` },
      ],
      k,
    ),
    praise: 'Du hast die Sprünge bis zum Ziel gezählt.',
    srText: prompt,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 2: steps of 1 and 10 crossing a hundred ───────────────────────────

/**
 * The first gap lies just across a full hundred: 397, 398, 399, A, B or 422, 412, 402, A, B. `ersteLuecke` 2 puts one more number between
 * the gaps, so that B has to be worked out from A.
 */
function ueberHundert(step: 1 | 10, richtung: Richtung, e: number, ersteLuecke: 2 | 3, stufe: Stufe, ab: Ab, rng: Rng): Exercise {
  const grenze = rng.int(2, 9) * 100;
  const davor = ersteLuecke - 1;
  // the number before the first gap: the last one on this side of the hundred
  const rand = richtung > 0 ? grenze - step + (step === 10 ? e : 0) : grenze + (step === 10 ? e : 0);
  const start = rand - richtung * davor * step;
  return reihenAufgabe({ zahlen: reihe(start, step, richtung, 5), luecken: ersteLuecke === 3 ? [3, 4] : [2, 4], step, richtung }, stufe, ab);
}

/** Forwards, the numbers are full tens or next to the hundred. */
const ueberEinfach: Form = (rng, stufe, ab) => ueberHundert(rng.pick<1 | 10>([1, 10]), 1, 0, 3, stufe, ab, rng);
/** A step of 10 from any start in both directions, a step of 1 backwards. */
const ueberMittel: Form = (rng, stufe, ab) => (rng.chance(0.7) ? ueberHundert(10, rng.pick(beide), rng.int(1, 9), 3, stufe, ab, rng) : ueberHundert(1, -1, 0, 3, stufe, ab, rng));
/** Backwards, and the gaps lie further apart. */
const ueberSchwer: Form = (rng, stufe, ab) => (rng.chance(0.7) ? ueberHundert(10, -1, rng.int(1, 9), 2, stufe, ab, rng) : ueberHundert(1, -1, 0, 2, stufe, ab, rng));

// ─── Stufe 3: steps of 25 and 50, any start; find the rule ───────────────────

/** Forwards from a multiple of the step. */
const grosseSchritteVielfach: Form = (rng, stufe, ab) => {
  const step = rng.pick([25, 25, 50]);
  const start = rng.int(2, Math.floor((1000 - 4 * step) / step)) * step;
  return reihenAufgabe({ zahlen: reihe(start, step, 1, 5), luecken: [3, 4], step, richtung: 1 }, stufe, ab);
};

const grosseSchritte = (richtungen: readonly Richtung[], lueckenWahl: readonly number[][]): Form => (rng, stufe, ab) => {
  const step = rng.pick([25, 25, 50]);
  const richtung = rng.pick(richtungen);
  const start = richtung > 0 ? rng.int(100, 1000 - 4 * step) : rng.int(100 + 4 * step, 1000);
  return reihenAufgabe({ zahlen: reihe(start, step, richtung, 5), luecken: rng.pick(lueckenWahl), step, richtung }, stufe, ab);
};

function regelFinden(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const step = rng.pick([5, 10, 20, 25, 50, 100]);
  const richtung = rng.chance(0.65) ? 1 : -1;
  const start = richtung > 0 ? rng.int(100, 1000 - 4 * step) : rng.int(100 + 4 * step, 1000);
  const zahlen = reihe(start, step, richtung, 4);
  const last = zahlen[3];
  const next = last + richtung * step;
  const wohin = richtung > 0 ? 'weiter' : 'zurück';
  const zeichen = richtung > 0 ? '+' : '−';
  const fields: MultiField[] = [
    { id: 'schritt', value: step, before: 'Immer', after: wohin, label: 'Schritt' },
    { id: 'next', value: next, before: 'Nächste Zahl:', label: 'Nächste Zahl' },
  ];
  const expression = zahlen.join(', ');
  const ueber = hundert(last) !== hundert(next);
  const r: Reihe = { zahlen: [...zahlen, next], luecken: [4], step, richtung };
  return build(SKILL, stufe, {
    key: `regel:${expression}`,
    ab,
    prompt: 'Finde die Regel und die nächste Zahl.',
    expression,
    answer: { kind: 'multi', fields },
    hints: ['Rechne den Abstand von 2 Zahlen nebeneinander.', 'Schau: Werden die Zahlen größer oder kleiner?'],
    steps: [`${richtung > 0 ? `${zahlen[1]} − ${zahlen[0]}` : `${zahlen[0]} − ${zahlen[1]}`} = ${step}`, `${last} ${zeichen} ${step} = ${next}`, { text: `Immer ${step} ${wohin}. Die nächste Zahl ist ${next}.`, visual: bild(r, true) }],
    bugs: multiBugs(
      [
        { id: 'richtung', match: { next: last - richtung * step }, hint: 'Schau: Werden die Zahlen größer oder kleiner?' },
        { id: 'schritt-falsch', match: { schritt: 2 * step }, hint: 'Nimm 2 Zahlen direkt nebeneinander.' },
        ...(ueber && step < 100 ? [{ id: 'zehner-ueber-hundert', match: { next: next - richtung * 100 }, hint: richtung > 0 ? 'Hier wird der Hunderter voll. Der Hunderter wird 1 größer.' : 'Hier reichen die Zehner nicht. Der Hunderter wird 1 kleiner.' }] : []),
      ],
      fields,
    ),
    praise: 'Du hast den Abstand gefunden und die Regel genutzt.',
    srText: `Finde die Regel und die nächste Zahl: ${expression}.`,
    kmk: [...KMK, 'PK.problemloesen'],
    knobel: true,
  });
}

/** The Stufe decides the content, the AB level the demand inside it. */
const FORMEN: Formen = {
  1: {
    1: [vielfache([1], [[3, 4]])],
    2: [vielfache(beide, [[1, 3], [2, 4]])],
    3: [vielfache([-1], [[1, 3], [2, 4]]), wieVieleSchritte],
  },
  2: {
    1: [ueberEinfach],
    2: [ueberMittel],
    3: [ueberSchwer],
  },
  3: {
    1: [grosseSchritteVielfach],
    2: [grosseSchritte(beide, [[3, 4], [2, 4]])],
    3: [regelFinden, regelFinden, grosseSchritte([-1], [[1, 3], [2, 4]])],
  },
};

export const zaehlenSkill: SkillDef = {
  ...SKILL,
  title: 'Zählen in Schritten',
  description: 'Du zählst vorwärts und rückwärts, auch über Hunderter.',
  stufen: {
    1: 'In Schritten von 10 und 100 zählen',
    2: 'Über den Hunderter: 395, 405',
    3: 'Schritte von 25 und 50 und die Regel finden',
  },
  kmk: KMK,
  generate: ausFormen(FORMEN),
};
