/**
 * German school notation (docs/research.md T10):
 * - money always with two decimals '3,40 €', or mixed '3 € 40 ct'; lengths '2 m 15 cm', '1,20 m'; quantities 'number + space + unit'
 * - no thousands separator: '1000', '2500 m'; clock times '13.50 Uhr'
 * - operators + − · : and the placeholder □
 */

/** No-break space between number and unit. */
export const NBSP = '\u00A0';

export const MINUS = '\u2212';
export const TIMES = '\u00B7';
export const DIV = ':';
export const BOX = '\u25A1';
export const APPROX = '\u2248';

/**
 * For showing a task: a line break never falls inside '9 · 2' or '56 : 7', between '□ Rest □', just before '= □', or between a
 * number and its unit (NBSP instead of the spaces, so it never splits up what the child reads as one piece).
 */
export function keepTermsTogether(text: string): string {
  return text
    .replace(new RegExp(` ([${TIMES}${DIV}]) `, 'g'), `${NBSP}$1${NBSP}`)
    .replace(/ Rest /g, `${NBSP}Rest${NBSP}`)
    .replace(new RegExp(` = ${BOX}`, 'g'), `${NBSP}=${NBSP}${BOX}`)
    .replace(new RegExp(`([\\d½¼¾${BOX}]) (€|ct|mm|cm|km|m|kg|g|ml|l|min|h|s|Uhr)(?=[\\s.,;:?!]|$)`, 'g'), `$1${NBSP}$2`);
}

/**
 * A number as it is written: fmt(2500) → '2500', fmt(-3) → '−3', fmt(1.7) → '1,7', fmt(2.5, 2) → '2,50'.
 * @param decimals fixed number of decimal places (default: as needed)
 */
export function fmt(n: number, decimals?: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`fmt: not a finite number: ${n}`);
  const abs = Math.abs(n);
  const text = decimals !== undefined ? abs.toFixed(decimals) : String(Math.round(abs * 1000) / 1000);
  return (n < 0 ? MINUS : '') + text.replace('.', ',');
}

/** Money from Cent with the comma, always two decimals (T10): fmtMoney(340) → '3,40 €', fmtMoney(305) → '3,05 €' */
export function fmtMoney(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`fmtMoney: cents must be a whole number ≥ 0: ${cents}`);
  return `${fmt(cents / 100, 2)}${NBSP}€`;
}

/** Money from Cent in mixed notation (T10): fmtMoneyMixed(340) → '3 € 40 ct', fmtMoneyMixed(300) → '3 €', fmtMoneyMixed(40) → '40 ct' */
export function fmtMoneyMixed(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`fmtMoneyMixed: cents must be a whole number ≥ 0: ${cents}`);
  return fmtMixed(cents, 100, '€', 'ct');
}

/**
 * A quantity in two units (T10): fmtMixed(35, 10, 'cm', 'mm') → '3 cm 5 mm', fmtMixed(2500, 1000, 'km', 'm') → '2 km 500 m',
 * fmtMixed(2300, 1000, 'kg', 'g') → '2 kg 300 g', fmtMixed(80, 60, 'min', 's') → '1 min 20 s'. A zero part stays out.
 */
export function fmtMixed(value: number, perLarge: number, large: string, small: string): string {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`fmtMixed: value must be a whole number ≥ 0: ${value}`);
  const big = Math.floor(value / perLarge);
  const rest = value % perLarge;
  if (big === 0) return `${rest}${NBSP}${small}`;
  return rest === 0 ? `${big}${NBSP}${large}` : `${big}${NBSP}${large} ${rest}${NBSP}${small}`;
}

/** Length from cm in mixed notation (T10): fmtLength(215) → '2 m 15 cm', fmtLength(200) → '2 m', fmtLength(15) → '15 cm' */
export function fmtLength(cm: number): string {
  if (!Number.isInteger(cm) || cm < 0) throw new RangeError(`fmtLength: cm must be a whole number ≥ 0: ${cm}`);
  const m = Math.floor(cm / 100);
  const rest = cm % 100;
  if (m === 0) return `${rest}${NBSP}cm`;
  return rest === 0 ? `${m}${NBSP}m` : `${m}${NBSP}m ${rest}${NBSP}cm`;
}

/** Quantity with unit: fmtQty(5, 'cm') → '5 cm', fmtQty(1.2, 'm', 2) → '1,20 m', fmtQty(1.7, 'km') → '1,7 km' */
export function fmtQty(n: number, unit: string, decimals?: number): string {
  return `${fmt(n, decimals)}${NBSP}${unit}`;
}

/** Clock time as in class (docs/research.md §5, §6): fmtTime(13, 50) → '13.50 Uhr', fmtTime(8, 5, false) → '8.05' */
export function fmtTime(hours: number, minutes: number, withUhr = true): string {
  const t = `${hours}.${String(minutes).padStart(2, '0')}`;
  return withUhr ? `${t}${NBSP}Uhr` : t;
}

/** A clock time from minutes since midnight, the values of a numberLine with `time`: fmtMinutes(830) → '13.50' */
export function fmtMinutes(total: number): string {
  return fmtTime(Math.floor(total / 60), total % 60, false);
}

/** Time span in mixed notation: fmtDuration(85) → '1 h 25 min', fmtDuration(60) → '1 h', fmtDuration(45) → '45 min' */
export function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}${NBSP}h`;
  return `${h}${NBSP}h ${m}${NBSP}min`;
}

// ─── Zahlwörter ──────────────────────────────────────────────────────────────

const ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** 1–999 as a word stem (1 → 'ein', used inside compounds). */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = h > 0 ? ONES[h] + 'hundert' : '';
  if (rest === 0) return out;
  if (rest < 10) return out + ONES[rest];
  if (rest < 20) return out + TEENS[rest - 10];
  const o = rest % 10;
  return out + (o > 0 ? ONES[o] + 'und' : '') + TENS[Math.floor(rest / 10)];
}

/**
 * German number word for 0 ≤ n < 10000 (conversions reach 9000 m).
 * numberWord(34) → 'vierunddreißig', numberWord(1) → 'eins', numberWord(305) → 'dreihundertfünf', numberWord(1000) → 'eintausend'
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 10000) throw new RangeError(`numberWord: out of range: ${n}`);
  if (n === 0) return 'null';
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const out = (th > 0 ? ONES[th] + 'tausend' : '') + (rest > 0 ? below1000(rest) : '');
  return rest % 100 === 1 ? `${out}s` : out;
}

/** Ordinal of a date ('der neunzehnte', 'am sechsundzwanzigsten'), 1 ≤ n ≤ 31; `ending` is 'e' or 'en'. */
export function ordinalWord(n: number, ending: 'e' | 'en'): string {
  const stem = n === 1 ? 'erst' : n === 3 ? 'dritt' : n === 7 ? 'siebt' : n === 8 ? 'acht' : `${numberWord(n)}${n < 20 ? 't' : 'st'}`;
  return stem + ending;
}

// ─── Screen-reader text ──────────────────────────────────────────────────────

/**
 * Turn displayed maths into speakable German text:
 * '7 · 8 = □' → '7 mal 8 gleich Lücke'.
 * A clock time stays a clock time: '14.30 Uhr' as is, and a spaced '21 : 0 Uhr' becomes '21.00 Uhr'
 * (never 'geteilt durch').
 */
export function toSpeech(text: string): string {
  return text
    .replace(/\b(\d{1,2})\s+:\s+(\d{1,2})(?=[\s\u00A0]+Uhr\b)/g, (_all, h: string, m: string) => `${h}.${m.padStart(2, '0')}`)
    .replace(/\u00B7/g, ' mal ')
    .replace(/\s:\s/g, ' geteilt durch ')
    .replace(/\u2212/g, ' minus ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\u2248/g, ' ist ungefähr ')
    .replace(/\u25A1/g, ' Lücke ')
    .replace(/\s=\s/g, ' gleich ')
    .replace(/\s<\s/g, ' ist kleiner als ')
    .replace(/\s>\s/g, ' ist größer als ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    // No space before punctuation ('… etwa 1 Lücke .' → '… etwa 1 Lücke.').
    .replace(/\s+([.,;!?])(?=\s|$)/g, '$1')
    .trim();
}

/** The signs of a comparison as words, e.g. on an answer button. */
export const SYMBOL_WORDS: Readonly<Record<string, string>> = { '<': 'kleiner als', '>': 'größer als', '=': 'gleich' };

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  mm: ['Millimeter', 'Millimeter'],
  cm: ['Zentimeter', 'Zentimeter'],
  m: ['Meter', 'Meter'],
  km: ['Kilometer', 'Kilometer'],
  g: ['Gramm', 'Gramm'],
  kg: ['Kilogramm', 'Kilogramm'],
  ml: ['Milliliter', 'Milliliter'],
  l: ['Liter', 'Liter'],
  ct: ['Cent', 'Cent'],
  '€': ['Euro', 'Euro'],
  h: ['Stunde', 'Stunden'],
  min: ['Minute', 'Minuten'],
  s: ['Sekunde', 'Sekunden'],
};

/** A unit standing alone, such as an option of 'Welche Einheit passt?', said as a word; undefined for any other text. */
export function unitWord(label: string): string | undefined {
  return Object.hasOwn(UNIT_WORDS, label) ? UNIT_WORDS[label][1] : undefined;
}

/** A fraction with a quantity (§2.4: only ½, ¼, ¾), as it is said. */
const FRACTION_WORDS: Record<string, string> = {
  '½ kg': 'ein halbes Kilogramm',
  '½ km': 'ein halber Kilometer',
  '½ m': 'ein halber Meter',
  '½ cm': 'ein halber Zentimeter',
  '½ l': 'ein halber Liter',
  '½ h': 'eine halbe Stunde',
  '¼ kg': 'ein Viertelkilogramm',
  '¼ l': 'ein Viertelliter',
  '¼ h': 'eine Viertelstunde',
  '¾ kg': 'ein Dreiviertelkilogramm',
  '¾ l': 'ein Dreiviertelliter',
  '¾ h': 'eine Dreiviertelstunde',
};

/**
 * toSpeech() plus spoken unit names: '3 € 40 ct' → '3 Euro 40 Cent', '1 h 25 min' → '1 Stunde 25 Minuten'. A comma with money or metres
 * reads as in class (T17): '3,05 €' → '3 Euro 5', '0,50 €' → '50 Cent', '1,20 m' → '1 Meter 20'; other commas as 'Komma': '1,7 km'.
 */
export function speak(text: string): string {
  return toSpeech(text)
    .replace(/([½¼¾]) (kg|km|cm|m|l|h)(?=$|[\s.,;:!?)])/g, (all: string) => FRACTION_WORDS[all] ?? all)
    .replace(/(^|\s)(\d+),(\d{2}) €(?=$|[\s.,;:!?)])/g, (_all, pre: string, euro: string, ct: string) => {
      if (Number(ct) === 0) return `${pre}${euro} Euro`;
      return Number(euro) === 0 ? `${pre}${Number(ct)} Cent` : `${pre}${euro} Euro ${Number(ct)}`;
    })
    .replace(/(^|\s)(\d+),(\d{2}) m(?=$|[\s.,;:!?)])/g, (_all, pre: string, m: string, cm: string) => `${pre}${m} ${m === '1' ? 'Meter' : 'Meter'} ${Number(cm)}`)
    .replace(/(\d),(\d)/g, '$1 Komma $2')
    .replace(/(^|\s)(\S+) (mm|cm|km|kg|ml|ct|min|m|g|l|h|s|€)(?=$|[\s.,;:!?)])/g, (_all, pre: string, num: string, unit: string) => {
      const [sg, pl] = UNIT_WORDS[unit];
      return `${pre}${num} ${num === '1' || num === 'ein' ? sg : pl}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text for the speech voice (docs/research.md T17): speak() with numbers as words, so '34' sounds as 'vierunddreißig' in every
 * voice, clock times as spoken ('8.30 Uhr' → 'acht Uhr dreißig'), dates as ordinals ('der 19.' → 'der neunzehnte', 'am 6.' →
 * 'am sechsten'), '1-mal' as 'einmal' and 'Z' and 'E' after a number as 'Zehner' and 'Einer'.
 * A 1 before a word (not a sign word: '1 mal 5' is 'eins mal fünf') stays a digit, as the voice knows the right ending ('1 Münze' → 'eine Münze').
 */
export function spokenWords(text: string): string {
  return speak(text)
    .replace(/\b(\d{1,2})[.:](\d{2}) Uhr/g, (_all, h: string, m: string) => (Number(m) === 0 ? `${h} Uhr` : `${h} Uhr ${m}`))
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_all, h: string, m: string) => (Number(m) === 0 ? `${h} Uhr` : `${h} Uhr ${m}`))
    // not \b at the end: it treats 'ü' as a word boundary, so '3 Türme' would turn into '3 Tausenderürme'
    .replace(/\b(\d+) Z(?![\p{L}\p{N}])/gu, '$1 Zehner')
    .replace(/\b(\d+) E(?![\p{L}\p{N}])/gu, '$1 Einer')
    .replace(/\b(\d+) H(?![\p{L}\p{N}])/gu, '$1 Hunderter')
    .replace(/\b(\d+) T(?![\p{L}\p{N}])/gu, '$1 Tausender')
    .replace(/\b(der|am|vom|zum|den) (\d{1,2})\.(\?)?/g, (_all, article: string, n: string, question: string | undefined) =>
      `${article} ${ordinalWord(Number(n), article === 'der' ? 'e' : 'en')}${question ?? '.'}`)
    .replace(/\b1-mal\b/g, 'einmal')
    .replace(/\d+/g, (digits: string, at: number, all: string) => {
      const n = Number(digits);
      if (n >= 10000) return digits;
      if (n === 1 && /^ (?!mal\b|gleich\b|plus\b|minus\b|geteilt\b)\p{L}/u.test(all.slice(at + digits.length))) return digits;
      return numberWord(n);
    });
}
