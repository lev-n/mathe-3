/**
 * Uhrzeit auf die Minute (docs/research.md §6).
 * AB I: five-minute steps, analog beside digital, the spoken quarter and half hours. A digital display beside a clock to read would show the
 * answer, so it stands in the worked solution there, and in the task where the child says the time in words.
 * AB II: exact minutes, analog only, read and choose.
 * AB III: pick the clock for 13.50 Uhr, 24-hour times.
 * Exact minutes start on Stufe 2 (G17): on Stufe 1, AB II and III stay on five-minute steps. Digital beside analog also holds for all of Stufe 1 (G17).
 */
import { fmtTime } from '../../core/format';
import type { Ab, ChoiceAnswer, ChoiceOption, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { makeChoice, multiBugs, numberBugs, plural, type ExerciseBody } from '../shared';
import { faceHour, generator, handsText, sr, timeFields, type Form } from './helpers';

const SKILL = { id: 'groessen.uhr', topicId: 'groessen' } as const;
const KMK = ['GM.zeit'];

const HINT_ZEIGER = 'Der kurze Zeiger zeigt die Stunde, der lange die Minuten.';
const HINT_MINUTE_ZAHL = 'Von Zahl zu Zahl sind es 5 Minuten. Geh in diesen Schritten weiter.';
const HINT_NAECHSTE = 'Der kurze Zeiger ist noch nicht bei der nächsten Zahl.';
const HINT_OHNE_12 = 'Nach 12 Uhr zählst du weiter. Rechne die Stunde plus 12.';
const WHY_STUNDE = 'Der kurze Zeiger zeigt die Stunde. Prüfe die Stunde.';
const WHY_MINUTE = 'Der lange Zeiger zeigt die Minuten. Prüfe die Minuten.';

const WORDS = ['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];

function hourStep(h: number, m: number): string {
  return m === 0 ? `Der kurze Zeiger zeigt auf die ${faceHour(h)}.` : `Der kurze Zeiger steht nach der ${faceHour(h)}.`;
}

/** The long hand, in words: on a number, or some ticks after it. */
function minuteSteps(m: number): string[] {
  const n = Math.floor(m / 5);
  const rest = m % 5;
  if (rest === 0) return [m === 0 ? 'Der lange Zeiger zeigt auf die 12: Das sind 0 Minuten.' : `Der lange Zeiger zeigt auf die ${n}: Das sind ${m} Minuten.`];
  const ticks = `${rest} ${rest === 1 ? 'Strich' : 'Striche'}`;
  if (n === 0) return [`Der lange Zeiger steht ${ticks} nach der 12: ${plural(m, 'Das ist', 'Das sind')} ${m} ${plural(m, 'Minute', 'Minuten')}.`];
  return [`Der lange Zeiger steht ${ticks} nach der ${n}.`, `${n} · 5 + ${rest} = ${m}`];
}

/** Stunde and minute that a swapped reading gives; null if the hands do not allow it. */
function swapped(h: number, m: number): { h: number; min: number } | null {
  return m > 0 && m % 5 === 0 ? { h: m / 5, min: (h % 12) * 5 } : null;
}

function readingBugs(h: number, m: number) {
  const swap = swapped(h, m);
  const n = Math.floor(m / 5);
  return [
    swap && { id: 'zeiger-getauscht', match: swap, hint: HINT_ZEIGER },
    n > 0 && { id: 'minute-zahl', match: { h, min: n }, hint: HINT_MINUTE_ZAHL },
    m % 5 !== 0 && n > 0 && { id: 'minute-strich', match: { h, min: n * 5 }, hint: 'Schau auch auf die kleinen Striche nach der letzten Zahl.' },
    m >= 30 && { id: 'naechste-stunde', match: { h: h + 1, min: m }, hint: HINT_NAECHSTE },
  ];
}

/** A line of the worked solution, on Stufe 1 and in AB I with the clock beside its digital display (G17, §6). */
function digitalStep(stufe: Stufe, ab: Ab, h: number, m: number, text: string): Step {
  return stufe === 1 || ab === 1 ? { text, visual: { type: 'clock', hours: h, minutes: m, face: 'five', showDigital: true } } : text;
}

const readSteps = (stufe: Stufe, ab: Ab, h: number, m: number): Step[] => [hourStep(h, m), ...minuteSteps(m), digitalStep(stufe, ab, h, m, `Es ist ${fmtTime(h, m)}.`)];

/** The face alone fits 8.20 and 20.20 Uhr: the time of day makes the reading unique. */
function tageszeit(h: number): string {
  return h < 9 ? 'Morgen' : h < 12 ? 'Vormittag' : 'Mittag';
}

function lesenTask(stufe: Stufe, ab: Ab, h: number, m: number, visual: Visual): ExerciseBody {
  const fields = timeFields(h, m);
  const prompt = `Es ist ${tageszeit(h)}. Wie spät ist es?`;
  return {
    key: `lesen:${h}:${m}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: m % 5 === 0 ? ['Der kurze Zeiger zeigt die Stunde.', 'Der lange Zeiger zeigt die Minuten. Von Zahl zu Zahl sind es 5 Minuten.'] : ['Der kurze Zeiger zeigt die Stunde.', 'Rechne in 5er-Schritten bis zur letzten Zahl. Zähle dann die kleinen Striche.'],
    steps: readSteps(stufe, ab, h, m),
    bugs: multiBugs([h < 12 && { id: 'vormittag-plus', match: { h: h + 12, min: m }, hint: `Diese Uhrzeit ist am Abend. Es ist ${tageszeit(h)}.` }, ...readingBugs(h, m)], fields),
    praise: m % 5 !== 0 ? 'Du hast die kleinen Striche genau gelesen.' : m >= 30 ? 'Du hast die Stunde am kurzen Zeiger gelesen.' : 'Du hast kurzen und langen Zeiger unterschieden.',
    srText: sr(prompt, handsText(h, m)),
    kmk: KMK,
  };
}

const lesenFuenf: Form = (rng, stufe, ab) => {
  const h = rng.int(6, 12);
  const m = rng.int(0, 11) * 5;
  return lesenTask(stufe, ab, h, m, { type: 'clock', hours: h, minutes: m, face: 'five' });
};

const zeigerZahl: Form = (rng, _stufe, ab) => {
  const h = rng.int(6, 12);
  const m = rng.int(1, 11) * 5;
  const value = m / 5;
  const prompt = `Es ist ${fmtTime(h, m)}. Auf welche Zahl zeigt der lange Zeiger?`;
  // No clock in the task, and no hands in srText: both show the number that is asked for.
  return {
    key: `zahl:${h}:${m}`,
    ab,
    prompt,
    answer: { kind: 'number', value, label: 'Zahl auf der Uhr' },
    hints: ['Von Zahl zu Zahl sind es 5 Minuten.', `Rechne in 5er-Schritten bis ${m}.`],
    steps: [`Es sind ${m} Minuten.`, `${value} · 5 = ${m}`, { text: `Der lange Zeiger zeigt auf die ${value}.`, visual: { type: 'clock', hours: h, minutes: m, face: 'five', showDigital: true } }],
    bugs: numberBugs([{ id: 'minute-zahl', match: m, hint: `Von Zahl zu Zahl sind es 5 Minuten. Teile ${m} durch 5.` }, { id: 'zeiger-getauscht', match: faceHour(h), hint: HINT_ZEIGER }], value),
    praise: 'Du hast die Minuten mit den Zahlen verbunden.',
    srText: sr(prompt),
    kmk: KMK,
  };
};

function waehlenTask(rng: Rng, stufe: Stufe, ab: Ab, h: number, m: number, visual: Visual): ExerciseBody {
  const swap = swapped(h, m);
  const n = Math.floor(m / 5);
  const option = (hh: number, mm: number, whyWrong: string): ChoiceOption => ({ label: fmtTime(hh, mm), whyWrong });
  const wrongs = [
    ...(swap && swap.h !== h ? [option(swap.h, swap.min, HINT_ZEIGER)] : []),
    ...(m % 5 !== 0 && n > 0 ? [option(h, n * 5, 'Schau auch auf die kleinen Striche nach der letzten Zahl.')] : []),
    ...(n > 0 ? [option(h, n, HINT_MINUTE_ZAHL)] : []),
    option(h + 1, m, m >= 30 ? HINT_NAECHSTE : WHY_STUNDE),
    option(h, (m + 5) % 60, WHY_MINUTE),
    option(h - 1, m, WHY_STUNDE),
  ];
  const prompt = 'Welche Uhrzeit zeigt die Uhr?';
  return {
    key: `waehlen:${h}:${m}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: fmtTime(h, m) }, wrongs, { max: stufe === 1 ? 4 : 5 }),
    hints: m % 5 === 0 ? ['Der kurze Zeiger zeigt die Stunde.', 'Von Zahl zu Zahl sind es 5 Minuten.'] : ['Der kurze Zeiger zeigt die Stunde.', 'Rechne in 5er-Schritten bis zur letzten Zahl. Zähle dann die kleinen Striche.'],
    steps: readSteps(stufe, ab, h, m),
    praise: m % 5 !== 0 ? 'Du hast die kleinen Striche genau gelesen.' : 'Du hast kurzen und langen Zeiger unterschieden.',
    srText: sr(prompt, handsText(h, m)),
    kmk: KMK,
  };
}

const waehlenFuenf: Form = (rng, stufe, ab) => {
  const h = rng.int(7, 11);
  const m = rng.int(0, 11) * 5;
  return waehlenTask(rng, stufe, ab, h, m, { type: 'clock', hours: h, minutes: m, face: 'five' });
};

const SPOKEN: Readonly<Record<number, { text: (h: number) => string; hint: string }>> = {
  15: { text: (h) => `Viertel nach ${WORDS[h]}`, hint: 'Viertel nach heißt: 15 Minuten nach der vollen Stunde.' },
  30: { text: (h) => `halb ${WORDS[h + 1]}`, hint: 'Halb heißt: eine halbe Stunde vor der nächsten vollen Stunde.' },
  45: { text: (h) => `Viertel vor ${WORDS[h + 1]}`, hint: 'Viertel vor heißt: 15 Minuten vor der nächsten vollen Stunde.' },
};

const spokenLine = (spoken: string, h: number, m: number) => `${spoken[0].toUpperCase()}${spoken.slice(1)} heißt: ${fmtTime(h, m)}.`;

const sprechen: Form = (rng, stufe, ab) => {
  const h = rng.int(1, 11);
  const m = rng.pick([15, 30, 45]);
  const { text, hint } = SPOKEN[m];
  const prompt = `Es ist ${text(h)}. Welche Uhrzeit passt?`;
  const wrong = (hh: number, mm: number): ChoiceOption => ({ label: fmtTime(hh, mm), whyWrong: hint });
  return {
    key: `sprechen:${h}:${m}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtTime(h, m) }, [wrong(h + 1, m), wrong(h, m === 15 ? 45 : 15), wrong(h + 1, m === 15 ? 45 : 15)]),
    hints: [hint, 'Eine Stunde hat 4 Viertelstunden.'],
    steps: [digitalStep(stufe, ab, h, m, spokenLine(text(h), h, m))],
    praise: m === 30 ? 'Du hast bei halb an die nächste Stunde gedacht.' : 'Du hast Viertel nach und Viertel vor unterschieden.',
    srText: sr(prompt),
    kmk: KMK,
  };
};

/** The clock beside its digital display, and the child says the time in words: the display does not give that away. */
const sagen: Form = (rng, stufe, ab) => {
  const h = rng.int(1, 11);
  const m = rng.pick([15, 30, 45]);
  const { text, hint } = SPOKEN[m];
  const prompt = 'Wie sagst du diese Uhrzeit?';
  const near = m === 15 ? `Viertel vor ${WORDS[h]}` : m === 30 ? `halb ${WORDS[h]}` : `Viertel nach ${WORDS[h + 1]}`;
  const wrongs = [...[15, 30, 45].filter((x) => x !== m).map((x) => SPOKEN[x].text(h)), near].map((label): ChoiceOption => ({ label, whyWrong: hint }));
  const display = `Die Anzeige zeigt ${fmtTime(h, m)}.`;
  return {
    key: `sagen:${h}:${m}`,
    ab,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m, face: 'five', showDigital: true },
    answer: makeChoice(rng, { label: text(h) }, wrongs),
    hints: ['Schau auf den langen Zeiger.', hint],
    steps: [display, digitalStep(stufe, ab, h, m, spokenLine(text(h), h, m))],
    praise: m === 30 ? 'Du hast bei halb an die nächste Stunde gedacht.' : 'Du hast Viertel nach und Viertel vor unterschieden.',
    srText: sr(prompt, handsText(h, m), display),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

/** A minute that is not on a number of the clock; on Stufe 1 a five-minute step (G17). */
function exactMinute(rng: Rng, stufe: Stufe): number {
  if (stufe === 1) return rng.int(1, 11) * 5;
  const m = rng.int(1, 59);
  return m % 5 === 0 ? m + 1 : m;
}

const lesenGenau: Form = (rng, stufe, ab) => {
  const h = rng.int(6, 12);
  const m = exactMinute(rng, stufe);
  return lesenTask(stufe, ab, h, m, { type: 'clock', hours: h, minutes: m });
};

const waehlenGenau: Form = (rng, stufe, ab) => {
  const h = rng.int(7, 11);
  const m = exactMinute(rng, stufe);
  return waehlenTask(rng, stufe, ab, h, m, { type: 'clock', hours: h, minutes: m });
};

const LETTERS = ['A', 'B', 'C', 'D'];

const uhrWaehlen: Form = (rng, stufe, ab) => {
  const h = rng.int(13, stufe === 1 ? 18 : 22);
  const m = rng.chance(0.5) ? rng.int(1, 11) * 5 : exactMinute(rng, stufe);
  const clock = (hh: number, mm: number): Visual => ({ type: 'clock', hours: hh, minutes: mm });
  const swap = swapped(h, m);
  const pool: { hh: number; mm: number; whyWrong: string }[] = [
    { hh: h + 1, mm: m, whyWrong: WHY_STUNDE },
    { hh: h - 1, mm: m, whyWrong: WHY_STUNDE },
    ...(swap ? [{ hh: swap.h, mm: swap.min, whyWrong: HINT_ZEIGER }] : []),
    { hh: h, mm: (m + 30) % 60, whyWrong: WHY_MINUTE },
    { hh: h, mm: (m + 5) % 60, whyWrong: WHY_MINUTE },
  ];
  // Two times can look the same on the face (13 and 1 Uhr), so the options differ by what the hands show.
  const faces = new Set([`${h % 12}:${m}`]);
  const wrongs = pool.filter((o) => {
    const face = `${o.hh % 12}:${o.mm}`;
    if (faces.has(face)) return false;
    faces.add(face);
    return true;
  }).slice(0, 3);
  const order = rng.shuffle<{ visual: Visual; whyWrong?: string }>([{ visual: clock(h, m) }, ...wrongs.map((o) => ({ visual: clock(o.hh, o.mm), whyWrong: o.whyWrong }))]);
  const options: ChoiceOption[] = order.map((o, i) => ({ label: `Uhr ${LETTERS[i]}`, visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  const correct = order.findIndex((o) => !o.whyWrong);
  const answer: ChoiceAnswer = { kind: 'choice', options, correct, layout: 'grid' };
  const prompt = `Welche Uhr zeigt ${fmtTime(h, m)}?`;
  return {
    key: `uhrwahl:${h}:${m}`,
    ab,
    prompt,
    answer,
    hints: [`Die Uhr zeigt die Zahlen nur bis 12. Rechne ${h} − 12.`, 'Der lange Zeiger zeigt die Minuten.'],
    steps: [`${h} − 12 = ${faceHour(h)}. ${hourStep(h, m)}`, ...minuteSteps(m), digitalStep(stufe, ab, h, m, `Das zeigt Uhr ${LETTERS[correct]}.`)],
    praise: 'Du hast die 24-Stunden-Zeit auf der Uhr gefunden.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

/** Afternoon or evening, with a minute that a hint about the 12 cannot give away. */
function pmTime(rng: Rng, stufe: Stufe): { h: number; m: number; part: 'Nachmittag' | 'Abend' } {
  const h = rng.int(13, 21);
  let m = stufe === 1 ? rng.int(0, 11) * 5 : rng.int(0, 59);
  if (m === 12) m = 13;
  return { h, m, part: h < 18 ? 'Nachmittag' : 'Abend' };
}

const vierundzwanzig: Form = (rng, stufe, ab) => {
  const { h, m, part } = pmTime(rng, stufe);
  const fields = timeFields(h, m);
  const prompt = `Es ist ${part}. Schreibe mit 24 Stunden. Wie spät ist es?`;
  return {
    key: `pm:${h}:${m}`,
    ab,
    prompt,
    visual: { type: 'clock', hours: h, minutes: m },
    answer: { kind: 'multi', fields },
    hints: [HINT_OHNE_12, 'Der lange Zeiger zeigt die Minuten.'],
    steps: [hourStep(h, m), `${faceHour(h)} + 12 = ${h}`, m === 0 ? 'Der lange Zeiger zeigt auf die 12: Das sind 0 Minuten.' : `Der lange Zeiger zeigt ${m} ${plural(m, 'Minute', 'Minuten')}.`, digitalStep(stufe, ab, h, m, `Es ist ${fmtTime(h, m)}.`)],
    bugs: multiBugs([{ id: 'ohne-12', match: { h: h - 12, min: m }, hint: HINT_OHNE_12 }, ...readingBugs(h, m)], fields),
    praise: 'Du hast nach 12 Uhr richtig weitergezählt.',
    srText: sr(prompt, handsText(h, m)),
    kmk: KMK,
  };
};

const umschreiben: Form = (rng, stufe, ab) => {
  const { h, m, part } = pmTime(rng, stufe);
  const fields = timeFields(h, m);
  const prompt = `Am ${part} ist es ${fmtTime(h - 12, m)}. Wie schreibst du die Uhrzeit mit 24 Stunden?`;
  return {
    key: `umschreiben:${h}:${m}`,
    ab,
    prompt,
    answer: { kind: 'multi', fields },
    hints: [HINT_OHNE_12, 'Die Minuten bleiben gleich.'],
    steps: [`${h - 12} + 12 = ${h}`, `Die Minuten bleiben gleich: ${m}.`, digitalStep(stufe, ab, h, m, `Es ist ${fmtTime(h, m)}.`)],
    bugs: multiBugs([{ id: 'ohne-12', match: { h: h - 12, min: m }, hint: HINT_OHNE_12 }], fields),
    praise: 'Du hast zur Stunde 12 dazugerechnet.',
    srText: sr(prompt),
    kmk: KMK,
  };
};

const kurzerZeiger: Form = (rng, stufe, ab) => {
  const h = rng.int(13, 22);
  const m = stufe === 1 ? rng.int(1, 11) * 5 : rng.int(1, 59);
  const value = h - 12;
  const prompt = `Es ist ${fmtTime(h, m)}. Nach welcher Zahl steht der kurze Zeiger?`;
  return {
    key: `kurz:${h}:${m}`,
    ab,
    prompt,
    answer: { kind: 'number', value, label: 'Zahl auf der Uhr' },
    hints: ['Die Uhr zeigt die Zahlen nur bis 12.', 'Zieh von der Stunde die 12 ab.'],
    steps: [{ text: `${h} − 12 = ${value}`, visual: { type: 'clock', hours: h, minutes: m, ...(stufe === 1 ? { showDigital: true } : {}) } }, `Der kurze Zeiger steht nach der ${value}.`],
    bugs: numberBugs([{ id: 'ohne-12', match: h, hint: 'Die Uhr zeigt nur Zahlen bis 12. Zieh von der Stunde 12 ab.' }], value),
    praise: 'Du hast die 24-Stunden-Zeit auf die Uhr übertragen.',
    srText: sr(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  };
};

export const uhrSkill: SkillDef = {
  ...SKILL,
  title: 'Uhrzeit auf die Minute',
  description: 'Du liest die Uhr ganz genau ab.',
  stufen: { 1: 'Uhrzeiten in 5-Minuten-Schritten', 2: 'Uhrzeiten auf die Minute lesen und wählen', 3: 'Die passende Uhr finden, Zeiten mit 24 Stunden' },
  kmk: KMK,
  generate: generator(SKILL, {
    1: [lesenFuenf, lesenFuenf, zeigerZahl, waehlenFuenf, sprechen, sagen],
    2: [lesenGenau, lesenGenau, waehlenGenau],
    3: [uhrWaehlen, vierundzwanzig, umschreiben, kurzerZeiger],
  }),
};
