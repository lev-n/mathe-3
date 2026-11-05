/**
 * Checkable text rules for 8–9-year-olds (docs/research.md §4). Words are whitespace tokens; the symbols + − · : = □ do not count
 * (nor does any other token without a letter or digit). Pure, used by src/core/testing.ts. Each check returns its problems as text.
 */
import { TEXT_LIMITS } from './age';
import type { Exercise, Step, Stufe } from './types';

/** The larger of Stufe and AB of an exercise: decides which notation is allowed yet (the catalogue's columns are roughly AB I–III). */
export type Level = 1 | 2 | 3;

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** Sentences: text up to . ! ? followed by a space or the end. A colon does not end a sentence. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/** T5: always banned; 'dass' opens a clause that is neither 'weil' nor 'wenn'. */
const SUBORDINATE = /(?<![\p{L}])(dass|obwohl|nachdem|während|damit|sodass)(?![\p{L}])/iu;
/** T5: at most one per task on Stufe 3, none below. */
const WEIL_WENN = /(?<![\p{L}])(weil|wenn)(?![\p{L}])/giu;

/** Words after a comma that can start a relative clause, with the rest of the clause. */
const RELATIVE = /,\s+(?:(?:in|an|auf|mit|von|zu|bei|für|aus)\s+)?(?:der|die|das|dem|den|denen|deren|dessen|welche[rsmn]?)\s+([^,.;:!?]+)/iu;
/** A clause end that is no verb: 'Der Zehner steht vorne, der Einer hinten.' */
const NO_VERB_END = /^(hinten|vorne|vorn|oben|unten|links|rechts|innen|außen|danach|davor|dabei|dazu)$/i;

/** T5 heuristic: a relative clause ends in a verb, a list has 'und'. It can miss or overreach: then the sentence is too long anyway. */
export function hasRelativeClause(text: string): boolean {
  const m = RELATIVE.exec(text);
  if (!m) return false;
  const clause = m[1].trim();
  if (/\bund\b/.test(clause)) return false;
  const last = clause.split(/\s+/).pop() ?? '';
  if (NO_VERB_END.test(last)) return false;
  return /^\p{Ll}/u.test(last) && /(t|e|en|st|n)$/.test(last);
}

/** Indirect question or free relative after a comma: 'Schau, wo Zehner und Einer gleich sind.' A comma inside a direct question stays fine. */
const INDIRECT = /,\s+(was|wie|wo|wer|wann|warum|ob|woher|wohin|woran)\s+([^,.;:!?]+)(?=[.,;:!]|$)/iu;
/** Free relative at the start of a sentence: 'Was links außen ist, kommt nach rechts außen.' */
const FREE_RELATIVE = /(?:^|:\s+)(was|wer|wo)\s+[^,?]+,[^?]*$/iu;

/** T5 heuristic: such a clause ends in a verb. 'wie ein Blatt Papier' ends in a noun, so a comparison passes. */
function indirectClause(text: string): string | null {
  const m = INDIRECT.exec(text);
  const last = m?.[2].trim().split(/\s+/).pop() ?? '';
  if (m && /^\p{Ll}/u.test(last) && !NO_VERB_END.test(last)) return m[1];
  for (const s of sentences(text)) {
    const free = FREE_RELATIVE.exec(s);
    if (free) return free[1];
  }
  return null;
}

/** T5: a word that opens a subordinate clause, or a relative clause; null if none. `stufe` 3 allows one 'weil' or 'wenn'. */
export function subordinateClause(text: string, stufe: Stufe = 1): string | null {
  const m = SUBORDINATE.exec(text);
  if (m) return m[1];
  const weilWenn = [...text.matchAll(WEIL_WENN)];
  if (weilWenn.length > (stufe === 3 ? 1 : 0)) return weilWenn[0][1];
  if (hasRelativeClause(text)) return 'Relativsatz';
  return indirectClause(text);
}

/** §7.2: a "count again" hint. Telling what to count ('Zähle die Sprünge, nicht die Striche.') is fine. */
const COUNT_AGAIN = [
  /(?<![\p{L}])zähl\p{L}*\s+(?:\p{L}+\s+)?(?:noch\s*(?:ein)?mal|nochmal|erneut|wieder|einfach|genau|nach)(?![\p{L}])/iu,
  /(?<![\p{L}])(?:noch\s*(?:ein)?mal|nochmal|erneut|wieder|einfach|genau)\s+(?:\p{L}+\s+)?(?:nach|ab)?zählen(?![\p{L}])/iu,
  /(?<![\p{L}])nachzähl\p{L}*/iu,
  /(?<![\p{L}])(?:mit\s+den\s+fingern|an\s+den\s+fingern)(?![\p{L}])/iu,
];

export function isCountAgainHint(text: string): boolean {
  return COUNT_AGAIN.some((re) => re.test(text));
}

/** T9: a pronoun for a noun of an earlier sentence, or across a colon. 'es' is not checked: it is mostly impersonal ('Es sind 7.'). */
const BACK_PRONOUN = /(?<![\p{L}])(sie|er|ihn|ihm|ihnen)(?![\p{L}])/iu;

export function pronounProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = t.split(/(?<=[.!?:])\s+/).slice(1).map((part) => BACK_PRONOUN.exec(part)).find(Boolean);
    if (found) out.push(`T9: "${found[1]}" in "${t}"`);
  }
  return out;
}

/** T10: a number word where digits belong. 'ein' and 'eine' stay: they are mostly articles. */
const QUANTITY_WORD = /(?<![\p{L}-])(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)(?![\p{L}-])/iu;

/** T10 exceptions: zahlen.zahlwort teaches number words, and groessen.uhr names spoken times ('halb drei'), which are no quantities. */
export const NUMBER_WORD_SKILLS: ReadonlySet<string> = new Set(['zahlen.zahlwort', 'groessen.uhr']);

export function numberWordProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = QUANTITY_WORD.exec(t);
    if (found) out.push(`T10: "${found[1]}" in "${t}"`);
  }
  return out;
}

const stepText = (step: Step) => (typeof step === 'string' ? step : step.text);

/** T8: letters of a word outside the allowlist. */
export const MAX_WORD_LETTERS = 14;

/**
 * T8: the long words children may meet, for reading review with real children (docs/research.md §4): the school's Fachwörter and the
 * names of pictures and skills. Add a word only if a simpler one would change the maths.
 */
export const LONG_WORD_ALLOWLIST: ReadonlySet<string> = new Set([
  'Aufgabenfamilie',
  'Aufgabenfamilien',
  'Balkendiagramme',
  'Geteiltaufgaben',
  'Hunderterplatte',
  'Hunderterplatten',
  'Malnehmaufgaben',
  'Nachbaraufgaben',
  'Nachbarhunderter',
  'Nachbarhundertern',
  'Quadrataufgaben',
  'Rechengeschichte',
  'Rechengeschichten',
  'Säulendiagramme',
  'Stellenwerttafel',
  'Stellenwerttafeln',
  'Tauschaufgaben',
  'Tausenderwürfel',
  'Tausenderwürfeln',
  'Wahrscheinlichkeit',
  'Zehnereinmaleins',
  'hintereinander',
  'unwahrscheinlich',
]);

/** Number words ('neunhunderteinundfünfzig'): zahlen.zahlwort teaches them. */
const NUMBER_WORD = /^((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)tausend)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)hundert)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und)?(eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)?$/iu;

/** T8: words of more than MAX_WORD_LETTERS letters outside the allowlist; a hyphen joins two words. */
export function longWords(text: string): string[] {
  const words = text.match(/\p{L}+/gu) ?? [];
  return words.filter((w) => [...w].length > MAX_WORD_LETTERS && !LONG_WORD_ALLOWLIST.has(w) && !NUMBER_WORD.test(w));
}

/** T8 on every text the child reads. */
export function longWordProblems(texts: readonly string[]): string[] {
  return texts.flatMap((t) => longWords(t).map((w) => `T8: "${w}" in "${t}"`));
}

/** T1–T4: the task text. An exercise with `context` counts as a Sachaufgabe (T2). */
export function taskTextProblems(ex: Pick<Exercise, 'prompt' | 'context' | 'expression'>, stufe: Stufe): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const all = [story, ex.expression].filter(Boolean).join(' ');
  const words = wordCount(all);
  if (ex.context) {
    if (words > TEXT_LIMITS.storyWords[stufe]) out.push(`T2: ${words} words on Stufe ${stufe} (at most ${TEXT_LIMITS.storyWords[stufe]}): "${all}"`);
  } else if (words > TEXT_LIMITS.taskWords) {
    out.push(`T1: ${words} words (at most ${TEXT_LIMITS.taskWords}): "${all}"`);
  }
  const parts = sentences(story);
  if (parts.length > TEXT_LIMITS.sentences) out.push(`T3: ${parts.length} sentences (at most ${TEXT_LIMITS.sentences}): "${story}"`);
  for (const s of parts) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[stufe]) out.push(`T4: ${wordCount(s)} words in a sentence on Stufe ${stufe} (at most ${TEXT_LIMITS.sentenceWords[stufe]}): "${s}"`);
  }
  return out;
}

/** T7: one question, always last; at most two numbers per sentence of the task. A mixed quantity ('3 € 40 ct', '1 h 25 min') is one number. */
export function questionProblems(ex: Pick<Exercise, 'prompt' | 'context'>): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const questions = (story.match(/\?/g) ?? []).length;
  if (questions > 1) out.push(`T7: ${questions} questions: "${story}"`);
  if (questions === 1 && !story.trim().endsWith('?')) out.push(`T7: the question must come last: "${story}"`);
  for (const s of sentences(story)) {
    const merged = s.replace(/\d+\s(€|km|m|cm|kg|h|min)\s\d+\s(ct|m|cm|mm|g|min|s)(?!\p{L})/gu, '#');
    const count = (merged.match(/#|\d+(?:[.,]\d+)?/g) ?? []).length;
    if (count > TEXT_LIMITS.sentenceNumbers) out.push(`T7: ${count} numbers in a sentence (at most ${TEXT_LIMITS.sentenceNumbers}): "${s}"`);
  }
  return out;
}

/** T10: digits as in class. No thousands separator; money with two decimals; a comma only with €, with m from level 2, with km on level 3, never '1,5 h'. */
export function numberFormatProblems(texts: readonly string[], level: Level = 3): string[] {
  const out: string[] = [];
  for (const t of texts) {
    if (/\d[.\u202F\u00A0]\d{3}(?!\d)/.test(t)) out.push(`T10: a thousands separator in "${t}"`);
    for (const m of t.matchAll(/\d,(\d+)(?:[\s\u00A0]?(€|km|m)(?!\p{L}))?/gu)) {
      const unit = m[2];
      if (!unit) out.push(`T10: a comma only with €, m and km: "${t}"`);
      else if (unit === '€' && m[1].length !== 2) out.push(`T10: money with two decimals: "${t}"`);
      else if (unit === 'm' && level < 2) out.push(`T10: the comma with m from level 2: "${t}"`);
      else if (unit === 'km' && level < 3) out.push(`T10: the comma with km on level 3: "${t}"`);
    }
  }
  return out;
}

const NOT_IN_PROMPTS = /(?<![\p{L}])(Dividend|Divisor|Minuend|Subtrahend)(?:en)?(?![\p{L}])/u;

/** T11: words that stay out of what a child reads. */
export function fachwortProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = NOT_IN_PROMPTS.exec(t);
    if (found) out.push(`T11: "${found[1]}" in "${t}"`);
  }
  return out;
}

/** T12: the words of the two subtraction methods never meet in one exercise. */
export function methodWordProblems(texts: readonly string[]): string[] {
  const all = texts.join(' ');
  return /entbünd/i.test(all) && /erweiter/i.test(all) ? [`T12: "Entbündeln" and "Erweitern" in one exercise: "${all}"`] : [];
}

/** G6: Rest in two fields, with a Probe line in the worked steps; never 'R' and never two Rest results chained with '='. */
export function restProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    if (/\d\s*R\s*\d/.test(t)) out.push(`G6: write "Rest" out: "${t}"`);
    if (/Rest\s*\d+\s*=[^.!?]*Rest/.test(t)) out.push(`G6: two Rest results chained with "=": "${t}"`);
  }
  return out;
}

/** T16: one hint (strategy hint, bug hint or whyWrong). */
export function hintProblems(hint: string): string[] {
  const out: string[] = [];
  if (wordCount(hint) > TEXT_LIMITS.hintWords) out.push(`T16: ${wordCount(hint)} words in a hint (at most ${TEXT_LIMITS.hintWords}): "${hint}"`);
  if (sentences(hint).length > TEXT_LIMITS.hintSentences) out.push(`T16: ${sentences(hint).length} sentences in a hint (at most ${TEXT_LIMITS.hintSentences}): "${hint}"`);
  if (isCountAgainHint(hint)) out.push(`§7.2: a "count again" hint: "${hint}"`);
  return out;
}

/** T16: praise and worked steps. */
export function praiseAndStepProblems(ex: Pick<Exercise, 'praise' | 'steps'>, stufe: Stufe): string[] {
  const out: string[] = [];
  if (wordCount(ex.praise) > TEXT_LIMITS.praiseWords) out.push(`T16: ${wordCount(ex.praise)} words of praise (at most ${TEXT_LIMITS.praiseWords}): "${ex.praise}"`);
  if (stufe === 1 && ex.steps.length > TEXT_LIMITS.stepsStufe1) out.push(`T16: ${ex.steps.length} worked steps on Stufe 1 (at most ${TEXT_LIMITS.stepsStufe1})`);
  for (const step of ex.steps) {
    const text = stepText(step);
    if (/\n/.test(text)) out.push(`T16: a worked step with a line break: "${text}"`);
    if (wordCount(text) > TEXT_LIMITS.stepWords) out.push(`T16: ${wordCount(text)} words in a worked step (at most ${TEXT_LIMITS.stepWords}): "${text}"`);
  }
  return out;
}

/** T6: subjunctive and past forms, and 'wird/werden' with a participle. 'Der Hunderter wird größer.' stays fine. */
const SUBJUNCTIVE = /(?<![\p{L}])(wurde|wurden|würde|hätte|wäre)(?![\p{L}])/iu;
const PASSIVE = /(?<![\p{L}])(wird|werden)(?![\p{L}])[^.!?,;:]*(?<![\p{L}])(?:ge|be|ver|er|zer|ent)\p{L}{3,}(?:t|en)(?![\p{L}])/iu;

/** T6 on every text the child reads. */
export function passiveProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = SUBJUNCTIVE.exec(t) ?? PASSIVE.exec(t);
    if (found) out.push(`T6: "${found[0]}" in "${t}"`);
  }
  return out;
}

/** T4, T5, T6, T8, T9 and T10 on a text outside the generators (badges, phrases, privacy text). */
export function childTextProblems(text: string): string[] {
  const out = [...clauseProblems([text]), ...longWordProblems([text]), ...pronounProblems([text]), ...numberWordProblems([text]), ...passiveProblems([text])];
  for (const s of sentences(text)) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[1]) out.push(`T4: ${wordCount(s)} words in a sentence: "${s}"`);
  }
  return out;
}

/** T5 on every text the child reads; `stufe` 3 allows one 'weil' or 'wenn' per text (pass the whole task as one text). */
export function clauseProblems(texts: readonly string[], stufe: Stufe = 1): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = subordinateClause(t, stufe);
    if (found) out.push(`T5: "${found}" in "${t}"`);
  }
  return out;
}
