/** Test support of the topic (imported only by *.test.ts): samples per AB level and an independent recomputation of conversion tasks. */
import { formatAnswer } from '../../core/check';
import { fmt, speak } from '../../core/format';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { evalSide } from '../step-check';

/** Exercises of every Stufe; with `ab` only this AB level, otherwise all three. */
export function byAb(skill: SkillDef, ab?: Ab, perCell = 120): Exercise[] {
  const out: Exercise[] = [];
  for (const stufe of STUFEN as readonly Stufe[]) {
    for (const level of ab ? [ab] : ([1, 2, 3] as Ab[])) {
      for (let seed = 1; seed <= perCell; seed++) out.push(skill.generate(createRng(seed * 4099 + stufe * 17 + level), stufe, { subtractionMethod: 'abziehen', extras: true, ab: level }));
    }
  }
  return out;
}

/** Everything a child reads in a task, its options, its help, its worked solution and its answer sentence. */
export function childTexts(ex: Exercise): string[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
  const said = ex.answer.kind === 'number' || ex.answer.kind === 'multi' ? [formatAnswer(ex.answer)] : [];
  return [ex.context ?? '', ex.prompt, ex.praise, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(ex.bugs ?? []).map((b) => b.hint), ...options, ...said];
}

/** The lines of a worked solution. */
export const stepLines = (ex: Exercise): string[] => ex.steps.map((s) => (typeof s === 'string' ? s : s.text));

const PLURAL_WITH_ONE = /(?<![\d,.])1[ \u00A0](?:Minuten|Stunden|Sekunden|Striche|kleine Striche)\b|Es bleiben 1[ \u00A0]|\bDas sind 1[ \u00A0]|\bsind es 1[ \u00A0]|(?<![\d,.])1[ \u00A0](?:mm|cm|m|km|g|kg|ml|l|ct|€|min|h|s) (?:bleiben|brauchen|stehen|haben)\b/;

/** Texts with a plural form with the value 1 ('1 Minuten', 'Es bleiben 1 mm', 'Das sind 1 ct'). '1 km sind 1000 m' reads as an equation and stays. */
export function pluralProblems(ex: Exercise): string[] {
  return childTexts(ex).filter((t) => PLURAL_WITH_ONE.test(t)).map((t) => `${ex.key}: ${t}`);
}

/** A choice of unit signs names every option as a word in srText, in the order on screen: the radios only have the signs (T17). */
export function unitChoiceProblems(ex: Exercise): string[] {
  const a = ex.answer;
  if (a.kind !== 'choice' || a.layout !== 'symbols') return [];
  const words = a.options.map((o) => speak(`2 ${o.label}`).slice(2));
  return ex.srText.endsWith(`Wähle aus: ${words.join(', ')}.`) ? [] : [`${ex.key}: "${ex.srText}" does not name ${words.join(', ')}`];
}

/** The worked steps of an order task end in the target order, with the labels of the task. */
export function orderStepProblems(ex: Exercise): string[] {
  const a = ex.answer;
  if (a.kind !== 'order') return [];
  const lines = ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
  const sign = a.direction === 'aufsteigend' ? '<' : '>';
  const wrongSign = a.direction === 'aufsteigend' ? '>' : '<';
  const chain = lines.filter((l) => l.includes(` ${sign} `) || l.includes(` ${wrongSign} `));
  const shown = chain.filter((l) => !l.startsWith('Der Größe nach')).map((l) => l.replace(/^(Also|Dann): /, '')).join(` ${sign} `);
  const expected = a.correct.map((i) => a.items[i]).join(` ${sign} `);
  const problems = shown === expected ? [] : [`${ex.key}: the steps state "${shown}", the answer is "${expected}"`];
  return chain.some((l) => l.includes(` ${wrongSign} `)) ? [...problems, `${ex.key}: a chain with ${wrongSign} on ${a.direction}`] : problems;
}

/** Stories and pictures with the same numbers must have the same key, so that de-duplication sees the repeat. */
export function keysWithDecoration(exercises: readonly Exercise[], signature: (ex: Exercise) => string): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const ex of exercises) {
    const sig = `${ex.stufe}|${signature(ex)}`;
    const key = seen.get(sig);
    if (key !== undefined && key !== ex.key) out.push(`${key} and ${ex.key}`);
    seen.set(sig, ex.key);
  }
  return out;
}

/**
 * 'left = □ unit' or 'left = □ unit □ unit', recomputed in base units by the unit-aware evaluator of the worked solutions.
 * Returns a problem text, or null if the answer fits (also null for an expression of another form).
 */
export function conversionProblem(ex: Exercise): string | null {
  const m = /^(.+) = □\s*(\S+)(?: □\s*(\S+))?$/.exec((ex.expression ?? '').replace(/ /g, ' '));
  if (!m) return null;
  const left = evalSide(m[1]);
  if (!left) return `cannot read "${m[1]}"`;
  const a = ex.answer;
  let right: string;
  if (a.kind === 'number' && !m[3]) right = `${fmt(a.value as number)} ${m[2]}`;
  else if (a.kind === 'multi' && m[3]) right = `${fmt(a.fields[0].value)} ${m[2]} ${fmt(a.fields[1].value)} ${m[3]}`;
  else return null;
  const value = evalSide(right)?.value;
  return value !== undefined && Math.abs(value - left.value) < 1e-6 ? null : `${ex.expression}: ${right} is ${value}, expected ${left.value}`;
}
