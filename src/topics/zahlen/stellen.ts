/**
 * Helpers of the topic 'zahlen': places of a number up to 1000, and the pictures that several skills draw from them. Pure functions.
 */
import { MAX_CHOICE_OPTIONS } from '../../core/age';
import type { Ab, Exercise, GenContext, PlaceColumn, Rng, Stufe, VisualOf } from '../../core/types';
import { targetAb } from '../shared';

/** One task form of a skill. */
export type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;
export type Formen = Readonly<Record<Stufe, Readonly<Record<Ab, readonly Form[]>>>>;

/** The generator of a skill: the Stufe decides the content (docs/research.md §6), the AB level the demand inside that content. */
export function ausFormen(formen: Formen) {
  return (rng: Rng, stufe: Stufe, ctx: GenContext): Exercise => {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(formen[stufe][ab])(rng, stufe, ab);
  };
}

export interface Stellen {
  h: number;
  z: number;
  e: number;
}

/** Hunderter, Zehner and Einer of 0–999 (1000: h is 10). */
export function stellen(n: number): Stellen {
  return { h: Math.floor(n / 100), z: Math.floor(n / 10) % 10, e: n % 10 };
}

export const zahl = (h: number, z: number, e: number) => 100 * h + 10 * z + e;

export const STELLE_WORT: Readonly<Record<PlaceColumn, string>> = { T: 'Tausender', H: 'Hunderter', Z: 'Zehner', E: 'Einer' };

/** A number from 111 to 999 without a zero (the catalogue's S1 numbers). */
export function ohneNullen(rng: Rng): number {
  return zahl(rng.int(1, 9), rng.int(1, 9), rng.int(1, 9));
}

/** Three different digits from 1 to 9. */
export function dreiZiffern(rng: Rng): [number, number, number] {
  const [a, b, c] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  return [a, b, c];
}

/** Stellenwerttafel with the digits of n: T, H, Z, E for 1000, otherwise H, Z, E. */
export function tafel(n: number): VisualOf<'placeValue'> {
  if (n === 1000) return { type: 'placeValue', columns: ['T', 'H', 'Z', 'E'], rows: [{ values: [1, 0, 0, 0] }] };
  const { h, z, e } = stellen(n);
  return { type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values: [h, z, e] }] };
}

/** Stellenwerttafel with one row per number up to 999, so that the places line up. */
export function tafelZeilen(zahlen: number[]): VisualOf<'placeValue'> {
  return {
    type: 'placeValue',
    columns: ['H', 'Z', 'E'],
    rows: zahlen.map((n) => {
      const { h, z, e } = stellen(n);
      return { values: [h, z, e] };
    }),
  };
}

/** Stellenwerttafel with these cells (null: an empty cell). */
export function tafelMit(values: (number | null)[]): VisualOf<'placeValue'> {
  return { type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values }] };
}

/** Base-ten material of n, without bundling. */
export function material(n: number): VisualOf<'baseTen'> {
  const { h, z, e } = stellen(n);
  return { type: 'baseTen', hundreds: h, tens: z, ones: e };
}

export interface StrahlOpts {
  labels?: number[];
  marks?: { value: number; label: string }[];
  jumps?: { from: number; to: number; label?: string }[];
}

/** Zahlenstrahl from min to max. */
export function strahl(min: number, max: number, majorStep: number, minorStep: number, labelMajor: boolean, opts: StrahlOpts = {}): VisualOf<'numberLine'> {
  return { type: 'numberLine', min, max, majorStep, minorStep, labelMajor, ...opts };
}

/** How many choice options this Stufe allows (docs/research.md §7.1). */
export const maxOptionen = (stufe: Stufe) => MAX_CHOICE_OPTIONS[stufe];
