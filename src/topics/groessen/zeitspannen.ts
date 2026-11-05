/**
 * Wie lange dauert das? (docs/research.md §6).
 * AB I: spans inside one hour, in minutes.
 * AB II: across a full hour: 13.50 Uhr plus 45 min; whole hours.
 * AB III: 1 h 25 min = 85 min, ¼ h, ½ h, ¾ h; 1 min = 60 s on Stufe 3 only (§2.2).
 */
import { BOX, NBSP, fmtDuration, fmtMixed, fmtTime } from '../../core/format';
import type { Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { multiBugs, numberBugs, plural } from '../shared';
import { fromStufe, generator, handsText, qty, sr, timeFields, type Form } from './helpers';

const SKILL = { id: 'groessen.zeitspannen', topicId: 'groessen' } as const;
const KMK = ['GM.zeit'];

const HINT_WANN = 'Gefragt ist: Wie lange? Nicht: Wann?';
const HINT_60 = 'Eine Stunde hat 60 Minuten.';
const HINT_BIS_VOLL = 'Eine Stunde hat 60 Minuten. Rechne erst bis zur vollen Stunde.';

interface Termin {
  nom: string;
  low: string;
  /** The longest this event lasts, in whole hours. */
  maxHours: number;
  /** Full hours at which it can start, for tasks of more than one hour. */
  starts: readonly [first: number, last: number];
}

const TERMINE: readonly Termin[] = [
  { nom: 'Der Film', low: 'der Film', maxHours: 3, starts: [14, 18] },
  { nom: 'Das Spiel', low: 'das Spiel', maxHours: 3, starts: [9, 16] },
  { nom: 'Die Probe', low: 'die Probe', maxHours: 3, starts: [9, 16] },
  { nom: 'Der Kurs', low: 'der Kurs', maxHours: 4, starts: [8, 14] },
  { nom: 'Die Führung', low: 'die Führung', maxHours: 3, starts: [9, 15] },
  { nom: 'Das Konzert', low: 'das Konzert', maxHours: 3, starts: [15, 18] },
  { nom: 'Das Turnen', low: 'das Turnen', maxHours: 2, starts: [8, 16] },
];

/** Events that can fill a day: only they carry the long spans of the whole-hour tasks. */
const LANGE_TERMINE: readonly Termin[] = [
  { nom: 'Der Ausflug', low: 'der Ausflug', maxHours: 7, starts: [8, 11] },
  { nom: 'Die Wanderung', low: 'die Wanderung', maxHours: 6, starts: [8, 12] },
  { nom: 'Das Schulfest', low: 'das Schulfest', maxHours: 5, starts: [10, 14] },
];

interface KurzTermin {
  nom: string;
  low: string;
  /** How long this event really lasts, in minutes. */
  span: readonly [shortest: number, longest: number];
  /** Full hours at which it can start. */
  hours: readonly [first: number, last: number];
}

/** Events for spans under an hour. Die Busfahrt fits every span and every hour of the tasks, so a task always finds one. */
const KURZE_TERMINE: readonly KurzTermin[] = [
  { nom: 'Die Busfahrt', low: 'die Busfahrt', span: [5, 55], hours: [8, 17] },
  { nom: 'Das Aufräumen', low: 'das Aufräumen', span: [5, 30], hours: [8, 17] },
  { nom: 'Das Vorlesen', low: 'das Vorlesen', span: [5, 30], hours: [8, 17] },
  { nom: 'Die Pause', low: 'die Pause', span: [5, 30], hours: [9, 13] },
  { nom: 'Der Spaziergang', low: 'der Spaziergang', span: [10, 55], hours: [9, 17] },
  { nom: 'Das Spiel', low: 'das Spiel', span: [15, 55], hours: [9, 16] },
  { nom: 'Die Probe', low: 'die Probe', span: [20, 55], hours: [9, 16] },
  { nom: 'Das Turnen', low: 'das Turnen', span: [20, 55], hours: [8, 16] },
  { nom: 'Die Führung', low: 'die Führung', span: [20, 55], hours: [9, 15] },
  { nom: 'Der Kurs', low: 'der Kurs', span: [30, 55], hours: [8, 14] },
];

/** An event that can last `minutes` and start in hour `h`: a film of 7 minutes or a concert at 8 Uhr would make no sense. */
function kurzerTermin(rng: Rng, h: number, minutes: number): KurzTermin {
  return rng.pick(KURZE_TERMINE.filter((e) => minutes >= e.span[0] && minutes <= e.span[1] && h >= e.hours[0] && h <= e.hours[1]));
}

const timeOf = (total: number) => fmtTime(Math.floor(total / 60), total % 60);

const jumpsOf = (points: readonly number[]) => points.slice(1).map((to, i) => ({ from: points[i], to, label: `+ ${to - points[i]} min` }));

/** A time line over one hour, with the jump inside it. */
function zeitstrahl(hour: number, from: number, to: number): Visual {
  return { type: 'numberLine', min: hour * 60, max: (hour + 1) * 60, majorStep: 15, minorStep: 5, labelMajor: true, time: true, jumps: jumpsOf([from, to]) };
}

/**
 * A time line across the full hour, zoomed to the span: the middles of the two jumps lie half a span apart, so their labels stay readable.
 * On a line over two hours, 14.55 to 15.05 Uhr puts them on top of each other. Every step divides the hour, so the full hour stays a long tick.
 */
function zeitstrahlUeber(start: number, full: number, end: number): Visual {
  const span = end - start;
  const majorStep = span <= 15 ? 5 : span <= 40 ? 10 : 15;
  return {
    type: 'numberLine',
    min: Math.floor(start / majorStep) * majorStep,
    max: Math.ceil(end / majorStep) * majorStep,
    majorStep,
    minorStep: majorStep === 5 ? 1 : 5,
    labelMajor: true,
    time: true,
    jumps: jumpsOf([start, full, end]),
  };
}

function minutesInHour(rng: Rng, stufe: Stufe): [number, number] {
  if (stufe === 1) {
    const a = rng.int(0, 8) * 5;
    return [a, a + rng.int(2, (55 - a) / 5) * 5];
  }
  const a = rng.int(1, 35);
  return [a, a + rng.int(7, 24)];
}

const spanneImStunde: Form = (rng, stufe, ab) => {
  const h = rng.int(8, 17);
  const [a, b] = minutesInHour(rng, stufe);
  const d = b - a;
  const e = kurzerTermin(rng, h, d);
  const context = `${e.nom} beginnt um ${fmtTime(h, a)}. ${e.nom} endet um ${fmtTime(h, b)}.`;
  const prompt = `Wie lange dauert ${e.low}?`;
  return {
    key: `spanne:${h}:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: d, unit: 'min', label: 'Dauer in Minuten' },
    hints: ['Geh vom Beginn in Schritten bis zum Ende.', 'Die Stunde bleibt gleich. Schau nur auf die Minuten.'],
    steps: [
      { text: 'Geh vom Beginn bis zum Ende.', visual: zeitstrahl(h, h * 60 + a, h * 60 + b) },
      `${qty(b, 'min')} − ${qty(a, 'min')} = ${qty(d, 'min')}`,
    ],
    bugs: numberBugs([{ id: 'zeitpunkt-spanne', match: b, hint: HINT_WANN }, { id: 'spanne-plus', match: a + b, hint: 'Geh vom Beginn weiter bis zum Ende. Das ist nur ein Teil der Stunde.' }], d),
    praise: 'Du hast vom Beginn bis zum Ende gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

const endeImStunde: Form = (rng, stufe, ab) => {
  const h = rng.int(8, 17);
  const [a, b] = minutesInHour(rng, stufe);
  const d = b - a;
  const e = kurzerTermin(rng, h, d);
  const fields = timeFields(h, b);
  const context = `${e.nom} beginnt um ${fmtTime(h, a)}. ${e.nom} dauert ${qty(d, 'min')}.`;
  const prompt = `Wann endet ${e.low}?`;
  return {
    key: `ende:${h}:${a}:${b}`,
    ab,
    context,
    prompt,
    ...(stufe === 1 ? { visual: { type: 'clock', hours: h, minutes: a, face: 'five' } as const } : {}),
    answer: { kind: 'multi', fields },
    hints: ['Rechne die Minuten zur Uhrzeit dazu.', 'Die Stunde bleibt gleich.'],
    steps: [`${qty(a, 'min')} + ${qty(d, 'min')} = ${qty(b, 'min')}`, `${e.nom} endet um ${fmtTime(h, b)}.`],
    bugs: multiBugs([{ id: 'zeitpunkt-spanne', match: { h, min: d }, hint: 'Das ist die Dauer. Gefragt ist: Wann endet der Termin?' }], fields),
    praise: 'Du hast die Minuten zur Uhrzeit dazugerechnet.',
    srText: sr(context, prompt, stufe === 1 ? handsText(h, a) : undefined),
    kmk: KMK,
  };
};

/** A start before the full hour and a span that crosses it, at most 55 minutes (with 5-minute steps on Stufe 1). */
function ueberStunde(rng: Rng, stufe: Stufe): { h: number; a: number; d: number; toFull: number; rest: number } {
  const h = rng.int(8, 17);
  const a = stufe === 1 ? rng.int(7, 11) * 5 : rng.int(36, 58);
  const toFull = 60 - a;
  const rest = stufe === 1 ? rng.int(1, (55 - toFull) / 5) * 5 : rng.int(3, 55 - toFull);
  return { h, a, d: toFull + rest, toFull, rest };
}

const endeUeber: Form = (rng, stufe, ab) => {
  const { h, a, d, toFull, rest } = ueberStunde(rng, stufe);
  const e = kurzerTermin(rng, h, d);
  const fields = timeFields(h + 1, rest);
  const context = `${e.nom} beginnt um ${fmtTime(h, a)}. ${e.nom} dauert ${qty(d, 'min')}.`;
  const prompt = `Wann endet ${e.low}?`;
  const start = h * 60 + a;
  return {
    key: `endeueber:${h}:${a}:${d}`,
    ab,
    context,
    prompt,
    visual: { type: 'clock', hours: h, minutes: a },
    answer: { kind: 'multi', fields },
    hints: [HINT_60, 'Rechne erst bis zur vollen Stunde, dann weiter.'],
    steps: [
      { text: `Bis zur vollen Stunde sind es ${qty(toFull, 'min')}.`, visual: zeitstrahlUeber(start, (h + 1) * 60, start + d) },
      `${qty(d, 'min')} − ${qty(toFull, 'min')} = ${qty(rest, 'min')}`,
      `${e.nom} endet um ${fmtTime(h + 1, rest)}.`,
    ],
    bugs: multiBugs(
      [
        { id: 'stunde-100', match: { h, min: a + d }, hint: HINT_BIS_VOLL },
        { id: 'stunde-vergessen', match: { h, min: rest }, hint: 'Du gehst über die volle Stunde. Die Stunde wird größer.' },
      ],
      fields,
    ),
    praise: 'Du hast erst bis zur vollen Stunde gerechnet.',
    srText: sr(context, prompt, handsText(h, a)),
    kmk: KMK,
  };
};

const spanneUeber: Form = (rng, stufe, ab) => {
  const { h, a, d, toFull, rest } = ueberStunde(rng, stufe);
  const e = kurzerTermin(rng, h, d);
  const context = `${e.nom} beginnt um ${fmtTime(h, a)}. ${e.nom} endet um ${fmtTime(h + 1, rest)}.`;
  const prompt = `Wie lange dauert ${e.low}?`;
  const start = h * 60 + a;
  return {
    key: `spanneueber:${h}:${a}:${d}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: d, unit: 'min', label: 'Dauer in Minuten' },
    hints: ['Rechne erst bis zur vollen Stunde.', 'Rechne dann die Minuten nach der vollen Stunde dazu.'],
    steps: [
      { text: `Bis zur vollen Stunde sind es ${qty(toFull, 'min')}.`, visual: zeitstrahlUeber(start, (h + 1) * 60, start + d) },
      `Danach kommen noch ${qty(rest, 'min')} dazu.`,
      `${qty(toFull, 'min')} + ${qty(rest, 'min')} = ${qty(d, 'min')}`,
    ],
    bugs: numberBugs(
      [
        { id: 'stunde-100', match: 100 + rest - a, hint: HINT_BIS_VOLL },
        { id: 'zeitpunkt-spanne', match: rest, hint: HINT_WANN },
        { id: 'nur-bis-stunde', match: toFull, hint: 'Das ist schon ein guter Schritt. Wie geht es nach der vollen Stunde weiter?' },
      ],
      d,
    ),
    praise: 'Du hast den Weg über die volle Stunde gerechnet.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

const stunden: Form = (rng, stufe, ab) => {
  const e = rng.pick([...TERMINE, ...LANGE_TERMINE]);
  const from = rng.int(...e.starts);
  const d = rng.int(2, Math.min(stufe === 1 ? 4 : 7, e.maxHours));
  const to = from + d;
  const context = `${e.nom} beginnt um ${qty(from, 'Uhr')}. ${e.nom} endet um ${qty(to, 'Uhr')}.`;
  const prompt = `Wie viele Stunden dauert ${e.low}?`;
  return {
    key: `stunden:${from}:${to}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: d, before: `${e.nom} dauert`, after: 'Stunden.', label: 'Dauer in Stunden' },
    hints: ['Geh von der ersten Uhrzeit in Stunden bis zur zweiten.', 'Rechne die größere Stunde minus die kleinere.'],
    steps: [`${to} − ${from} = ${d}`, `Von ${qty(from, 'Uhr')} bis ${qty(to, 'Uhr')} sind es ${d} Stunden.`],
    bugs: numberBugs([{ id: 'zeitpunkt-spanne', match: to, hint: HINT_WANN }, { id: 'spanne-plus', match: from + to, hint: 'Geh von der ersten Uhrzeit bis zur zweiten. Das ist weniger als beide zusammen.' }], d),
    praise: 'Du hast die Dauer gerechnet, nicht die Uhrzeit.',
    srText: sr(context, prompt),
    kmk: KMK,
  };
};

const hMinZuMin: Form = (rng, stufe, ab) => {
  const h = rng.int(1, stufe === 1 ? 2 : 3);
  const m = rng.int(1, 11) * 5;
  const value = h * 60 + m;
  const prompt = 'Schreibe in Minuten.';
  const expression = `${fmtDuration(value)} = ${BOX}${NBSP}min`;
  return {
    key: `hmin:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'min', label: 'Dauer in Minuten' },
    hints: [HINT_60, 'Rechne zuerst die Stunden in Minuten um.'],
    steps: [`${qty(h, 'h')} = ${h} · 60 min = ${qty(h * 60, 'min')}`, `${qty(h * 60, 'min')} + ${qty(m, 'min')} = ${qty(value, 'min')}`],
    bugs: numberBugs(
      [
        { id: 'stunde-100', match: h * 100 + m, hint: HINT_60 },
        { id: 'einheiten-gemischt', match: h + m, hint: 'Rechne zuerst alles in Minuten um.' },
      ],
      value,
    ),
    praise: 'Du hast mit 60 Minuten pro Stunde gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const minZuHMin: Form = (rng, stufe, ab) => {
  const h = rng.int(1, stufe === 1 ? 2 : 3);
  const m = rng.int(1, 11) * 5;
  const value = h * 60 + m;
  const fields = [{ id: 'h', value: h, after: 'h', label: 'Stunden' }, { id: 'min', value: m, after: 'min', label: 'Minuten' }];
  const prompt = 'Schreibe in Stunden und Minuten.';
  const expression = `${qty(value, 'min')} = ${BOX}${NBSP}h ${BOX}${NBSP}min`;
  const hundreds = Math.floor(value / 100);
  return {
    key: `minh:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [HINT_60, 'Wie oft passen 60 Minuten hinein? Der Rest bleibt in Minuten.'],
    steps: [`${h} · 60 min = ${qty(h * 60, 'min')}`, `${qty(value, 'min')} − ${qty(h * 60, 'min')} = ${qty(m, 'min')}`, `${qty(value, 'min')} = ${fmtDuration(value)}`],
    bugs: multiBugs(
      [
        hundreds > 0 && { id: 'stunde-100', match: { h: hundreds, min: value % 100 }, hint: HINT_60 },
        { id: 'stunde-100', match: { h: Math.floor(value / 10), min: value % 10 }, hint: HINT_60 },
      ],
      fields,
    ),
    praise: 'Du hast aus 60 Minuten eine Stunde gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const HINT_S = '1 Minute hat 60 Sekunden.';
const HINT_S_ONE = 'Eine Minute hat so viele Sekunden wie eine Stunde Minuten.';

const minZuS: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 5);
  const s = n === 1 && rng.chance(0.3) ? 0 : rng.int(1, 11) * 5;
  const value = n * 60 + s;
  const prompt = 'Schreibe in Sekunden.';
  const expression = `${fmtMixed(value, 60, 'min', 's')} = ${BOX}${NBSP}s`;
  const hint = value === 60 ? HINT_S_ONE : HINT_S;
  return {
    key: `mins:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 's', label: 'Dauer in Sekunden' },
    hints: [hint, 'Rechne zuerst die Minuten in Sekunden um.'],
    steps: [`${qty(n, 'min')} = ${n} · 60 s = ${qty(n * 60, 's')}`, ...(s > 0 ? [`${qty(n * 60, 's')} + ${qty(s, 's')} = ${qty(value, 's')}`] : [])],
    bugs: numberBugs(
      [
        { id: 'minute-100', match: n * 100 + s, hint },
        s > 0 && { id: 'einheiten-gemischt', match: n + s, hint: 'Rechne zuerst alles in Sekunden um.' },
      ],
      value,
    ),
    praise: 'Du hast mit 60 Sekunden pro Minute gerechnet.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const sZuMin: Form = (rng, _stufe, ab) => {
  const n = rng.int(1, 4);
  const s = rng.int(1, 11) * 5;
  const value = n * 60 + s;
  const fields = [{ id: 'min', value: n, after: 'min', label: 'Minuten' }, { id: 's', value: s, after: 's', label: 'Sekunden' }];
  const prompt = 'Schreibe in Minuten und Sekunden.';
  const expression = `${qty(value, 's')} = ${BOX}${NBSP}min ${BOX}${NBSP}s`;
  return {
    key: `smin:${value}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'multi', fields },
    hints: [HINT_S, 'Wie oft passen 60 Sekunden hinein?'],
    steps: [`${n} · 60 s = ${qty(n * 60, 's')}`, `${qty(value, 's')} − ${qty(n * 60, 's')} = ${qty(s, 's')}`, `${qty(value, 's')} = ${fmtMixed(value, 60, 'min', 's')}`],
    bugs: multiBugs(
      [
        value >= 100 && { id: 'minute-100', match: { min: Math.floor(value / 100), s: value % 100 }, hint: HINT_S },
        { id: 'minute-100', match: { min: Math.floor(value / 10), s: value % 10 }, hint: HINT_S },
      ],
      fields,
    ),
    praise: 'Du hast aus 60 Sekunden eine Minute gemacht.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const BRUCH = [
  { text: '¼', value: 15, bug: 25, steps: ['60 min : 4 = 15 min'] },
  { text: '½', value: 30, bug: 50, steps: ['60 min : 2 = 30 min'] },
  { text: '¾', value: 45, bug: 75, steps: ['60 min : 4 = 15 min', '3 · 15 min = 45 min'] },
] as const;

const bruchStunde: Form = (rng, _stufe, ab) => {
  const b = rng.pick(BRUCH);
  const plus = rng.pick([0, 0, 60, 10, 20]);
  const value = b.value + plus;
  const prompt = 'Rechne in Minuten.';
  const left = plus === 60 ? `1${NBSP}h + ${b.text}${NBSP}h` : plus > 0 ? `${b.text}${NBSP}h + ${qty(plus, 'min')}` : `${b.text}${NBSP}h`;
  const expression = `${left} = ${BOX}${NBSP}min`;
  const hint = 'Eine Stunde hat 60 Minuten. Nimm davon den Teil.';
  return {
    key: `bruch:${b.text}:${plus}`,
    ab,
    prompt,
    expression,
    answer: { kind: 'number', value, unit: 'min', label: 'Dauer in Minuten' },
    hints: [HINT_60, 'Teile die 60 Minuten in gleiche Teile.'],
    steps: [...b.steps, ...(plus > 0 ? [`${qty(b.value, 'min')} + ${qty(plus, 'min')} = ${qty(value, 'min')}`] : [`${b.text}${NBSP}h = ${qty(value, 'min')}`])],
    bugs: numberBugs([{ id: 'stunde-komma', match: b.bug + plus, hint }], value),
    praise: 'Du hast den Teil von 60 Minuten genommen.',
    srText: sr(prompt, expression),
    kmk: KMK,
  };
};

const langeFahrt: Form = (rng, stufe, ab) => {
  const e = rng.pick(TERMINE);
  const h = rng.int(...e.starts);
  const a = stufe === 1 ? rng.int(1, 9) * 5 : rng.int(11, 49);
  // Whole hours plus some minutes: stays below the longest this event lasts.
  const dur = rng.int(1, Math.min(2, e.maxHours - 1)) * 60 + rng.int(1, 11) * 5;
  const end = h * 60 + a + dur;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  const fields = timeFields(eh, em);
  const context = `${e.nom} beginnt um ${fmtTime(h, a)}. ${e.nom} dauert ${fmtDuration(dur)}.`;
  const prompt = `Wann endet ${e.low}?`;
  const hours = Math.floor(dur / 60);
  const mid = h * 60 + a + hours * 60;
  return {
    key: `lang:${h}:${a}:${dur}`,
    ab,
    context,
    prompt,
    answer: { kind: 'multi', fields },
    hints: ['Rechne zuerst die ganzen Stunden dazu.', 'Rechne dann die Minuten dazu. Eine Stunde hat 60 Minuten.'],
    steps: [`Erst ${qty(hours, 'h')} dazu: ${timeOf(mid)}.`, `Dann ${qty(dur % 60, 'min')} dazu: ${timeOf(end)}.`],
    bugs: multiBugs(
      [
        a + dur % 60 >= 60 && { id: 'stunde-100', match: { h: h + hours, min: a + dur % 60 }, hint: 'Eine Stunde hat 60 Minuten. Rechne erst bis zur vollen Stunde.' },
        a + dur % 60 >= 60 && { id: 'stunde-vergessen', match: { h: h + hours, min: (a + dur % 60) % 60 }, hint: 'Du gehst über die volle Stunde. Die Stunde wird größer.' },
        { id: 'zeitpunkt-spanne', match: { h: hours, min: dur % 60 }, hint: 'Das ist die Dauer. Gefragt ist: Wann endet der Termin?' },
      ],
      fields,
    ),
    praise: `Du hast erst die ${plural(hours, 'Stunde', 'Stunden')} und dann die Minuten gerechnet.`,
    srText: sr(context, prompt),
    kmk: [...KMK, 'GM.sachsituationen'],
  };
};

export const zeitspannenSkill: SkillDef = {
  ...SKILL,
  title: 'Wie lange dauert das?',
  description: 'Du rechnest mit Minuten und Stunden.',
  stufen: { 1: 'Zeitspannen innerhalb einer Stunde', 2: 'Über die volle Stunde rechnen', 3: 'Stunden, Minuten und Sekunden umwandeln' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [spanneImStunde, endeImStunde],
    2: [endeUeber, spanneUeber, spanneUeber, stunden],
    3: [hMinZuMin, minZuHMin, fromStufe(3, minZuS), fromStufe(3, sZuMin), bruchStunde, langeFahrt],
  }),
};
