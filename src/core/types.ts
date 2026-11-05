/**
 * Core contracts shared by every part of the app.
 *
 * Generators (src/topics/**) are pure functions: (rng, stufe, ctx) → Exercise.
 * Exercises are plain data (no functions) so they can be tested, de-duplicated,
 * printed on worksheets and rendered by generic UI components.
 *
 * See docs/research.md for the reasoning behind the fields (hints, steps, bugs, praise …).
 */

// ─── Basics ──────────────────────────────────────────────────────────────────

/** Difficulty level shown to children as "Stufe 1/2/3" (≈ KMK Anforderungsbereich I/II/III). */
export type Stufe = 1 | 2 | 3;
export const STUFEN: readonly Stufe[] = [1, 2, 3];

/** KMK Anforderungsbereich of one item. A round of any Stufe mixes all three (src/core/age.ts AB_MIX). */
export type Ab = 1 | 2 | 3;

/** Länder setting for written subtraction (docs/research.md §2.3): the visual, Sprechweise and bug library follow it, never mixed. */
export type SubtractionMethod = 'abziehen' | 'ergaenzen';

export type TopicId =
  | 'zahlen'
  | 'schriftlich'
  | 'kopfrechnen'
  | 'groessen'
  | 'geometrie'
  | 'daten'
  | 'sachaufgaben';

/** Seeded pseudo-random generator. Never use Math.random() in generators. */
export interface Rng {
  /** The seed this generator was created with (shown on worksheets). */
  readonly seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled copy of an array (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p. */
  chance(p: number): boolean;
  /** n distinct elements of an array, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
}

/** Grid cell coordinate: x = column (0 = left), y = row (0 = top). */
export type Cell = readonly [x: number, y: number];

export type ColorName = 'rot' | 'blau' | 'gelb' | 'gruen' | 'lila' | 'orange';

// ─── Visuals (declarative; rendered by src/ui/visuals/*) ──────────────────────

export type PlaceColumn = 'T' | 'H' | 'Z' | 'E';

export type SolidKind =
  | 'wuerfel'
  | 'quader'
  | 'kugel'
  | 'zylinder'
  | 'kegel'
  | 'pyramide';

export type ShapeKind = 'quadrat' | 'rechteck' | 'dreieck' | 'gleichseitiges-dreieck' | 'kreis' | 'sechseck' | 'achteck' | 'parallelogramm' | 'raute';

export type PictoIcon = 'person' | 'stern' | 'ball' | 'buch' | 'apfel';

/** Symmetry axis on a grid. `at` = position in cell units from the left (vertical) or top (horizontal). */
export interface Axis {
  orientation: 'vertical' | 'horizontal';
  /** Line position in cell units (e.g. 4 = line between column 3 and 4). */
  at: number;
}

export type WrittenOp = 'add' | 'sub' | 'mul';

/** A digit of a written calculation drawn as a labelled empty box. place 0 = Einer; index = operand row (row 'operand'). */
export interface WrittenMask {
  row: 'operand' | 'result';
  index?: number;
  place: number;
  label: string;
}

export type Visual =
  /**
   * Stellenwerttafel with digits. values[i] belongs to columns[i]; null = empty cell. headers replaces the column heads for a money
   * table (LISUM: 10 €, 1 €, 10 ct, 1 ct); columns then only names the places, so give one header per column.
   */
  | { type: 'placeValue'; columns: PlaceColumn[]; headers?: string[]; rows: { values: (number | null)[] }[] }
  /**
   * Zahlenstrahl. Ticks every minorStep, longer ticks every majorStep. Labels at every major tick if labelMajor, plus explicit `labels`.
   * Marks are arrows with a letter/text. Jumps are arcs with an arrowhead (Rechenstrich-style steps, for hints and worked solutions),
   * e.g. { from: 35, to: 40, label: '+ 5' }. For an empty Rechenstrich: majorStep = minorStep = max − min, labels at the jump ends.
   * time: every value is minutes since midnight and labels read as clock times (830 → '13.50'), so jump arcs work for Zeitspannen.
   */
  | { type: 'numberLine'; min: number; max: number; majorStep: number; minorStep: number; labelMajor: boolean; labels?: number[]; marks?: { value: number; label: string }[]; jumps?: { from: number; to: number; label?: string }[]; time?: boolean }
  /**
   * Hunderterplatten, Zehnerstangen and Einerwürfel. tens and ones may exceed 9 (Bündeln: 3 H 14 Z), ones are drawn in
   * fives. second adds material in the second look ('dazu': drawn after the first; 'weg': the last pieces of the first are crossed out).
   */
  | { type: 'baseTen'; hundreds?: number; tens: number; ones: number; second?: { hundreds?: number; tens?: number; ones?: number; mode: 'dazu' | 'weg' } }
  /**
   * A page of the Tausenderbuch, start 301 for 301–400: 10 numbers per row, and every cell list holds real
   * numbers of that page. masked: cells without their number, shown as □ (one cell) or as A, B, … (several, in the array's order).
   * marked: cells with a ring.
   * piece: draw only these cells, as a cut-out piece in its original arrangement. replaced: a cell shows another number
   * (Fehlerdetektiv: "find the wrong number in a piece").
   */
  | { type: 'hundredChart'; start: number; masked?: number[]; marked?: number[]; piece?: number[]; replaced?: { cell: number; shows: number }[] }
  /**
   * Punktefeld for the Einmaleins (rows × cols dots). splitAfterRow/splitAfterCol leave a gap (Kraft der Fünf, a split for derivation).
   */
  | { type: 'dotArray'; rows: number; cols: number; splitAfterRow?: number; splitAfterCol?: number }
  /**
   * Dots in repeated groups, each with a frame (3 groups of 4: groups [4, 4, 4]; unequal groups, or a Rest: [5, 5, 5, 2]).
   * perRow: dots in a row inside a group (default 5).
   */
  | { type: 'dotArray'; groups: number[]; perRow?: number }
  /**
   * Column layout of a written calculation. showSolution draws result, carries and marks. places adds the head row H Z E (G4: labels on
   * Stufe 1). shownResult draws a given (e.g. planted wrong) result instead of the computed one (Fehlerdetektiv); masks draw single digits as
   * labelled empty boxes (Ziffernrätsel). mul has a one-digit second factor.
   */
  | {
      type: 'written';
      op: WrittenOp;
      operands: number[];
      method?: SubtractionMethod;
      showSolution: boolean;
      places?: boolean;
      shownResult?: number;
      masks?: WrittenMask[];
    }
  /** Square grid with filled cells (area/perimeter/symmetry figures). halfCells are triangles, half a Kästchen (geometrie.flaeche, Stufe 3). */
  | { type: 'grid'; width: number; height: number; cells: Cell[]; halfCells?: { cell: Cell; corner: 'tl' | 'tr' | 'bl' | 'br' }[]; axis?: Axis; showOutline?: boolean; caption?: string; labels?: { cell: Cell; text: string }[] }
  /** Hexomino or net on a grid. faces[i] (optional) is a label or colour name drawn on cells[i]; highlight marks cells by index. */
  | { type: 'net'; cells: Cell[]; faces?: (string | null)[]; highlight?: number[] }
  /** Körper drawing. The aria-label describes it without its name; named: the name instead (a task asks for what the description would state). */
  | { type: 'solid'; solid: SolidKind; named?: boolean }
  /** rotate: degrees clockwise (a turned square). showAxes draws the symmetry axes as dashed lines. named: as for 'solid'. */
  | { type: 'shape'; shape: ShapeKind; rotate?: number; showAxes?: boolean; named?: boolean }
  /** Musterreihe: shapes side by side. color is named in the aria-label; an entry without shape is the empty place to fill. */
  | { type: 'shapeRow'; items: ({ shape: ShapeKind; color?: ColorName } | { shape?: undefined })[] }
  /** Würfelgebäude. heights[row][col] = number of stacked cubes; row 0 = back. view 'plan' = Bauplan (top view with numbers). */
  | { type: 'cubeBuilding'; heights: number[][]; view: 'iso' | 'plan' | 'front' | 'side' | 'top' }
  /** Säulendiagramm, or Balkendiagramm with horizontal. The value axis starts at 0. */
  | { type: 'barChart'; title: string; categories: string[]; values: number[]; axisMax: number; axisStep: number; horizontal?: boolean; valueLabel?: string }
  /** Bilddiagramm with its legend. */
  | { type: 'pictogram'; title: string; categories: string[]; values: number[]; iconValue: number; icon: PictoIcon }
  | { type: 'tally'; title?: string; rows: { label: string; count: number }[] }
  | { type: 'table'; caption?: string; header: string[]; rows: string[][] }
  /** Glücksrad with equal sectors in the given order. */
  | { type: 'spinner'; sectors: ColorName[] }
  /** Säckchen with Kugeln. */
  | { type: 'bag'; balls: { color: ColorName; count: number }[] }
  | { type: 'dice'; values: number[] }
  /** Baumdiagramm: levels[i] = options at depth i (the full tree is drawn). */
  | { type: 'tree'; levels: string[][] }
  /**
   * Analog clock (+ optional digital display). hours 0–23. Without face it draws all 60 minute ticks, 'five' only the
   * 5-minute ticks.
   */
  | { type: 'clock'; hours: number; minutes: number; showDigital?: boolean; face?: 'five' }
  /** Coins and notes, values in Cent: 1, 2, 5, 10, 20, 50, 100, 200 (coins), 500, 1000, 2000, 5000, 10000 (notes). */
  | { type: 'money'; items: number[] }
  /**
   * Lineal in cm with mm ticks; an object (bar) from startMm to startMm + lengthMm is drawn above it. minCm > 0 draws a broken ruler
   * that starts at this number. second is another object above the first (compare two lengths).
   */
  | { type: 'ruler'; maxCm: number; startMm: number; lengthMm: number; minCm?: number; second?: { startMm: number; lengthMm: number } }
  /** Messbecher. */
  | { type: 'container'; capacityMl: number; fillMl: number; stepMl: number }
  /** Küchenwaage (dial). */
  | { type: 'scale'; maxGrams: number; stepGrams: number; grams: number };

export type VisualType = Visual['type'];
export type VisualOf<T extends VisualType> = Extract<Visual, { type: T }>;

// ─── Answers ─────────────────────────────────────────────────────────────────

export interface NumberAnswer {
  kind: 'number';
  /** Correct value. null = the task is not solvable and "Nicht lösbar" is correct (requires offerUnsolvable). */
  value: number | null;
  /** Unit shown after the input field (the child does not type it), e.g. '€', 'cm', 'Kästchen'. */
  unit?: string;
  /** Allowed decimal places. Without it the answer is a whole number and the Ziffernblock has no comma key (docs/research.md §7.1). */
  decimals?: number;
  /** Text directly before/after the input, e.g. an Antwortsatz: before 'Lena bezahlt', after '€.' */
  before?: string;
  after?: string;
  /** Show a "Nicht lösbar – es fehlt eine Angabe" button. */
  offerUnsolvable?: boolean;
  /** Visible label for screen readers if before/after is not descriptive. */
  label?: string;
}

export interface ChoiceOption {
  label: string;
  visual?: Visual;
  /** Targeted feedback when this (wrong) option is chosen. */
  whyWrong?: string;
}

export interface ChoiceAnswer {
  kind: 'choice';
  options: ChoiceOption[];
  correct: number;
  /** 'symbols' = short labels like <, >, =; 'grid' = options with visuals. Default: a list. */
  layout?: 'symbols' | 'grid';
  /** The child has to read these options: read-aloud leaves them out (an option spoken as a number word gives a Zahlwort task away). */
  silentOptions?: boolean;
}

export interface MultiField {
  id: string;
  value: number;
  /** Text before/after this field, e.g. '[3] €' '[40] ct'. */
  before?: string;
  after?: string;
  /** As NumberAnswer.decimals. */
  decimals?: number;
  label?: string;
}

export interface MultiAnswer {
  kind: 'multi';
  fields: MultiField[];
}

export interface WrittenAnswer {
  kind: 'written';
  op: WrittenOp;
  /** add: 2–3 Summanden; sub: [Minuend, Subtrahend]; mul: [Faktor, one-digit Faktor]. */
  operands: number[];
  /** Summe, Differenz or Produkt. */
  result: number;
  method?: SubtractionMethod;
  /**
   * Expected Überschlag value (schriftlich.pruefen, Stufe 2). When set, the child first writes an Überschlag:
   * it is required and checked loosely (CheckResult.ueberschlagOk), but never part of `correct`.
   */
  ueberschlag?: number;
}

export interface CellsAnswer {
  kind: 'cells';
  width: number;
  height: number;
  /** Pre-filled cells that the child cannot toggle. */
  given: Cell[];
  /** Cells the child must switch on (in addition to `given`). */
  solution: Cell[];
  axis?: Axis;
}

export interface NumberLineAnswer {
  kind: 'numberline';
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  /** Snapping step of the marker (usually minorStep). */
  step: number;
  value: number;
  /** Accepted absolute deviation (0 = exact). */
  tolerance: number;
  labelMajor: boolean;
  /** Explicitly labelled values (in addition to major labels if labelMajor). Default: both ends when !labelMajor. */
  labels?: number[];
  /** As in the numberLine visual: values are minutes since midnight, labels clock times. */
  time?: boolean;
}

export interface OrderAnswer {
  kind: 'order';
  /** Items in display order. */
  items: string[];
  /** Indices of `items` in the correct order. */
  correct: number[];
  direction: 'aufsteigend' | 'absteigend';
  /** Replaces the instruction 'zuerst das Größte' where the items are no quantities (colours, events). */
  instruction?: string;
}

export type Answer =
  | NumberAnswer
  | ChoiceAnswer
  | MultiAnswer
  | WrittenAnswer
  | CellsAnswer
  | NumberLineAnswer
  | OrderAnswer;

export type AnswerKind = Answer['kind'];
export type AnswerOf<K extends AnswerKind> = Extract<Answer, { kind: K }>;

/** What the child entered. Raw text is parsed by src/core/parse.ts. */
export type Response =
  | { kind: 'number'; text: string; unsolvable?: boolean }
  | { kind: 'choice'; index: number }
  | { kind: 'multi'; values: Record<string, string> }
  | { kind: 'written'; result: string; ueberschlag?: string }
  | { kind: 'cells'; cells: Cell[] }
  | { kind: 'numberline'; value: number }
  | { kind: 'order'; order: number[] };

/**
 * A typical wrong answer (misconception / "bug") with a targeted hint.
 * match: number for number/written/numberline answers,
 *        Record<fieldId, number> for multi answers,
 *        number[] for order answers (an index order like OrderAnswer.correct).
 * (Choice answers use ChoiceOption.whyWrong instead.)
 * Bug ids are internal (never shown to children).
 */
export interface Bug {
  id: string;
  match: number | Record<string, number> | number[];
  hint: string;
}

/** A step of a worked solution. A plain string or text with an optional visual. */
export type Step = string | { text: string; visual?: Visual };

// ─── Exercise ────────────────────────────────────────────────────────────────

export interface Exercise {
  /** Canonical identity (skill + parameters) used to avoid repeats, e.g. 'zahlen.stellenwerte:2:47'. */
  key: string;
  topicId: TopicId;
  skillId: string;
  stufe: Stufe;
  /** KMK Anforderungsbereich of this item: GenContext.ab when set. Use targetAb() from src/topics/shared.ts. */
  ab: Ab;
  /** Short German instruction, du-form. Text limits: src/core/age.ts, checked by describeSkill (T1–T5). */
  prompt: string;
  /** Story text. An exercise with context counts as a Sachaufgabe (T2): context + prompt ≤ 25/32/40 words on Stufe 1/2/3. */
  context?: string;
  /** Optional large maths expression, e.g. '7 · 8 = □' or '45 + 8 = □'. */
  expression?: string;
  visual?: Visual;
  answer: Answer;
  /** Strategy hints, shown one at a time (≥ 1). Never contain the answer. */
  hints: string[];
  /** Worked solution with the child's numbers (≥ 1). The last step states the result. */
  steps: Step[];
  /** Typical wrong answers with targeted hints. */
  bugs?: Bug[];
  /** Specific process praise, completing "Richtig! …", e.g. 'Du bist erst zum Zehner gegangen.' */
  praise: string;
  /** Plain-text version for screen readers (operators spelled out, e.g. '7 mal 8'). */
  srText: string;
  /** KMK tags from src/data/curriculum.ts. */
  kmk: string[];
  /** Knobelaufgabe (harder thinking task). */
  knobel?: boolean;
  /** Einmaleins fact key for per-fact spaced repetition: factKeyOf(a, b) or divFactKeyOf(p, d) from src/state/facts.ts (100 Mal facts, 90 Geteilt facts). */
  factKey?: string;
}

// ─── Skills & topics ─────────────────────────────────────────────────────────

export interface FactBox {
  box: number;
  due?: string;
}

/** Read-only context passed to generators. */
export interface GenContext {
  /** The child's written subtraction method (default 'abziehen'). Never mix the two inside one exercise or round. */
  subtractionMethod: SubtractionMethod;
  /** Include optional extra skills (topics that are not compulsory in every Bundesland). */
  extras: boolean;
  /** Per-fact Leitner boxes (keys from src/state/facts.ts, such as '2x7' or '56:7'). */
  facts?: Readonly<Record<string, FactBox>>;
  /** ISO date 'YYYY-MM-DD' (for due facts). */
  today?: string;
  /** The AB level the round plans for this item: the generator returns an item with exactly this `ab`. */
  ab?: Ab;
  /** A review slot wants this fact: the fact's skill (src/state/facts.ts factSkillId) returns exactly this task as its `factKey`. */
  factKey?: string;
  /** A twin or example around this fact: the fact's skill returns another fact worked out the same way. */
  similarTo?: string;
  /** Facts a `similarTo` task must not ask: a later slot of the round would no longer be recall. */
  avoidFacts?: readonly string[];
}

export interface SkillDef {
  /** Globally unique, `${topicId}.${slug}`, e.g. 'zahlen.nachbarn'. Never change once released (stored in progress). */
  id: string;
  topicId: TopicId;
  /** Short German title, e.g. 'Nachbarzahlen'. */
  title: string;
  /** One child-friendly German sentence. */
  description: string;
  /** What each Stufe contains (child-friendly German, ≤ 12 words each). */
  stufen: Record<Stufe, string>;
  kmk: string[];
  /** 'extra' = optional skill, labelled 'Extra'; never counts toward topic progress or badges (docs/research.md §7.1). */
  optional?: 'extra';
  /** A minus skill: follows GenContext.subtractionMethod, and the method is asked once before its first round (docs/research.md §7.1). */
  usesMethod?: true;
  /** Pure: same rng seed + stufe + ctx ⇒ same exercise. */
  generate(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise;
}

export interface TopicModule {
  topicId: TopicId;
  skills: SkillDef[];
}

export interface TopicMeta {
  id: TopicId;
  title: string;
  shortTitle: string;
  description: string;
  /** CSS custom property suffix, e.g. 'zahlen' → var(--topic-zahlen) / var(--topic-zahlen-bg). */
  color: TopicId;
}

// ─── Checking ────────────────────────────────────────────────────────────────

export interface CheckResult {
  correct: boolean;
  /** Input could not be interpreted (e.g. empty, '3,5'). Not counted as an attempt; show this message. */
  invalid?: string;
  /** Targeted hint from a matched Bug or a wrong ChoiceOption. */
  bugHint?: string;
  /** Id of the matched Bug (internal, never shown): the error-library tag of this mistake (src/state/growth.ts). */
  bugId?: string;
  /** multi: correctness per field id. */
  fieldCorrect?: Record<string, boolean>;
  /** written: wrong result digit positions, 0 = Einer (rightmost). */
  wrongColumns?: number[];
  /** written with an Überschlag: the child's Überschlag is close enough to the expected one (within 25 %). */
  ueberschlagOk?: boolean;
  /** cells: cells that are on but should be off, and missing cells. */
  extraCells?: Cell[];
  missingCells?: Cell[];
}
