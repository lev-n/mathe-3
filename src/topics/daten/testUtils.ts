/** Test support of the topic 'daten' (imported only by *.test.ts): samples of one Stufe and one planned AB level. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TEXT_LIMITS } from '../../core/age';
import { BOX } from '../../core/format';
import { createRng } from '../../core/rng';
import { wordCount } from '../../core/textRules';
import { STUFEN } from '../../core/types';
import type { Ab, Exercise, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import BarChartVisual from '../../ui/visuals/BarChartVisual';
import TreeVisual from '../../ui/visuals/TreeVisual';

export function atLevel(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 5003 + stufe * 17 + ab), stufe, { subtractionMethod: 'abziehen', extras: true, ab }));
}

/** The form of an exercise: the key part after '<skillId>:<stufe>:'. */
export const formOf = (ex: Exercise): string => ex.key.split(':')[2];

export function tableOf(ex: Exercise): VisualOf<'table'> {
  if (ex.visual?.type !== 'table') throw new Error(`${ex.key}: a table expected`);
  return ex.visual;
}

export function numberOf(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`${ex.key}: a number expected`);
  return ex.answer.value;
}

/** The label of the correct option. */
export function correctLabel(ex: Exercise): string {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: a choice expected`);
  return ex.answer.options[ex.answer.correct].label;
}

/** Every item of every Stufe and AB level. */
export function allLevels(skill: SkillDef, n = 60): Exercise[] {
  return STUFEN.flatMap((stufe) => ([1, 2, 3] as const).flatMap((ab) => atLevel(skill, stufe, ab, n)));
}

/** All visuals of an item: the task, the options and the worked steps. */
export function visualsOf(ex: Exercise): Visual[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.visual ? [o.visual] : [])) : [];
  const steps = ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual ? [s.visual] : []));
  return [...(ex.visual ? [ex.visual] : []), ...options, ...steps];
}

/** The answer as the field and the solution show it: '8 Kinder'. */
const answerText = (ex: Exercise): string => (ex.answer.kind === 'number' && ex.answer.value !== null ? [ex.answer.value, ex.answer.unit, ex.answer.after].filter(Boolean).join(' ') : '');

/** All sentences a child reads on an item. */
export function textsOf(ex: Exercise): string[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
  return [ex.context ?? '', ex.prompt, ex.praise, answerText(ex), ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...options, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))];
}

/** A count of 1 with a plural noun or verb: '1 Kugeln', 'sind nur 1', 'sind es 1.' */
const ONE_WITH_PLURAL = /(?<![\d,.])1 (?:\p{L}+e )?(?:Kugeln|Felder|Seiten|Bücher|Kinder|Gäste|Flaschen|Minuten|Möglichkeiten|Paare|Reihenfolgen|Zeilen|Bilder)(?!\p{L})|\bsind (?:es )?(?:nur )?1(?![\d,.]*\d)/u;

export const agreementProblems = (skill: SkillDef): string[] => allLevels(skill).flatMap((ex) => textsOf(ex).filter((t) => ONE_WITH_PLURAL.test(t)).map((t) => `${ex.key}: ${t}`));

/** T1: what the child reads of a task, at most 15 words. The shared suite treats every task with a context as a story (T2); here only Sachaufgaben are stories, and this topic has none. */
export const longTasks = (skill: SkillDef): string[] => allLevels(skill, 150).flatMap((ex) => {
  const task = [ex.context, ex.prompt].filter(Boolean).join(' ');
  return wordCount(task) > TEXT_LIMITS.taskWords ? [`${ex.key}: ${wordCount(task)} words: ${task}`] : [];
});

/** T11: words that need a definition card. This topic has none, so it says 'plus' and 'zusammen'. */
const NEEDS_CARD = /(?<!\p{L})(?:Summe|Differenz|addier|subtrahier)/iu;

export const fachwortOverreach = (skill: SkillDef): string[] => [...allLevels(skill).flatMap(textsOf), ...Object.values(skill.stufen), skill.description].filter((t) => NEEDS_CARD.test(t));

/** How often the most frequent value occurs, as a share of all values. */
export function topShare(values: readonly unknown[]): number {
  const counts = new Map<unknown, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

/** Smallest width of a chart in px, as the real component draws it (--vw · --min-scale). */
export function chartFloor(visual: VisualOf<'barChart'>): number {
  const html = renderToStaticMarkup(createElement(BarChartVisual, { visual }));
  return Number(/--vw:\s*([\d.]+)px/.exec(html)![1]) * Number(/--min-scale:\s*([\d.]+)/.exec(html)![1]);
}

/** Width and height of a Baumdiagramm in px, as the real component draws it. */
export function treeSize(visual: VisualOf<'tree'>): { width: number; height: number } {
  const html = renderToStaticMarkup(createElement(TreeVisual, { visual }));
  return { width: Number(/ width="([\d.]+)"/.exec(html)![1]), height: Number(/ height="([\d.]+)"/.exec(html)![1]) };
}

/**
 * Smallest width of a table on a phone, estimated: per column the longest word (cells wrap at spaces) at the 24 px of
 * TableVisual.css plus padding and border. Measured in Chrome at 375 px, the estimate is within about 20 px.
 */
export function tableFloor(t: VisualOf<'table'>): number {
  // A gap is drawn as a box 2.5 rem wide, about as wide as 3 letters.
  const longest = (text: string) => (text === BOX ? 3 : Math.max(...text.split(' ').map((w) => w.length)));
  return t.header.reduce((sum, h, c) => sum + Math.max(56, Math.max(longest(h), ...t.rows.map((r) => longest(r[c]))) * 13.5 + 34), 0);
}
