/**
 * Missing digit (Stufe 3 of the plus and minus skills without Übertrag): one digit of a calculation is a labelled box. No Übertrag happens,
 * so the answer follows from its own column.
 */
import { MINUS } from '../../core/format';
import type { Ab, Exercise, Rng, Stufe, SubtractionMethod, WrittenMask } from '../../core/types';
import { correctResult, digitAt, numLength, placeName, writtenVisual } from '../../core/written';
import { build, bugList } from '../shared';
import { solved, type SkillRef } from './common';

function spoken(n: number, mask: WrittenMask | null): string {
  const out: string[] = [];
  for (let p = numLength(n) - 1; p >= 0; p--) out.push(mask?.place === p ? 'Lücke A' : String(digitAt(n, p)));
  return out.join(' ');
}

/** Where the box stands: in operand 0, 1 or 2, or in the result. */
export type LueckeRow = 0 | 1 | 2 | 'r';

const ROW_KEY = (row: LueckeRow) => (row === 'r' ? 'r' : 'abc'[row]);

/** The column in the Sprechweise of Ergänzen, with the A in place of the digit it hides. */
function missingColumn(row: LueckeRow, da: number, db: number, dr: number): string {
  if (row === 0) return `Von ${db} bis A ${dr === 1 ? 'fehlt' : 'fehlen'} ${dr}`;
  if (row === 1) return `Von A bis ${da} ${dr === 1 ? 'fehlt' : 'fehlen'} ${dr}`;
  return `Von ${db} bis ${da} fehlt A`;
}

/** A task for a calculation without Übertrag: plus with two or three numbers, minus with two. `rows`: where the box may stand. */
export function lueckeItem(skill: SkillRef, stufe: Stufe, ab: Ab, rng: Rng, op: 'add' | 'sub', operands: number[], method: SubtractionMethod, kmk: string[], rows: readonly LueckeRow[] = [0, 1, 'r']): Exercise {
  const result = correctResult(op, operands);
  // a place inside every number, so the column has all its digits and a result
  const place = rng.int(0, Math.min(...operands.map(numLength), numLength(result)) - 1);
  const row = rng.pick(rows);
  const digits = operands.map((n) => digitAt(n, place));
  const [da, db] = digits;
  const dr = digitAt(result, place);
  const mask: WrittenMask = row === 'r' ? { row: 'result', place, label: 'A' } : { row: 'operand', index: row, place, label: 'A' };
  const value = row === 'r' ? dr : digits[row];
  const sign = op === 'add' ? '+' : MINUS;
  const column = op === 'sub' && method === 'ergaenzen' ? missingColumn(row, da, db, dr) : `${digits.map((d, i) => (i === row ? 'A' : d)).join(` ${sign} `)} = ${row === 'r' ? 'A' : dr}`;
  const name = placeName(place);
  const others = digits.reduce((s, d, i) => (i === row ? s : s + d), 0);

  // the other way round in the column: the top digit from the bottom digits, with plus and minus swapped
  const wrong = op === 'add' ? (row === 'r' ? Math.abs(2 * da - others) : dr + others) : row === 0 ? Math.abs(dr - db) : row === 1 ? da + dr : da + db;
  const bugs = bugList(value, [['luecke-rechnung', wrong, 'Schau genau auf das A. Dann rechne die Spalte.']]);

  const n = (x: number, r: LueckeRow) => spoken(x, row === r ? mask : null);
  const srText = `Ziffernrätsel. ${operands.map((x, i) => n(x, i as LueckeRow)).join(op === 'add' ? ' plus ' : ' minus ')} gleich ${n(result, 'r')}. Welche Ziffer ist A?`;
  return build(skill, stufe, {
    key: `luecke:${op}:${operands.join('|')}:${ROW_KEY(row)}${place}:${method[0]}`,
    ab,
    prompt: 'Welche Ziffer gehört in das Kästchen A?',
    visual: writtenVisual({ type: 'written', op, operands: [...operands], method: op === 'sub' ? method : undefined, showSolution: false, shownResult: result, masks: [mask] }),
    answer: { kind: 'number', value, before: 'A =', label: 'Ziffer A' },
    hints: [`Das A steht bei den ${name === 'Einer' ? 'Einern' : name === 'Zehner' ? 'Zehnern' : 'Hundertern'}. Schau nur auf diese Spalte.`, `Rechne in dieser Spalte: ${column}.`],
    steps: [`${name}: ${column}.`, { text: `Das Kästchen A ist ${value}.`, visual: solved(op, operands, method, stufe) }],
    bugs,
    praise: 'Du hast die Spalte mit dem Kästchen geprüft.',
    srText,
    kmk,
    knobel: true,
  });
}
