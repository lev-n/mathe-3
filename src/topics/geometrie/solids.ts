/**
 * Facts about the Körper of Klasse 3. Conventions, stated in the tasks: a gebogene Fläche counts as a Fläche (Zylinder 3, Kegel 2, Kugel 1).
 * The Spitze of a Kegel is no Ecke, and textbooks differ on round Kanten, so no task asks for the Ecken of a Kegel or the Kanten of a Zylinder or Kegel.
 */
import type { SolidKind } from '../../core/types';

export type KoerperKind = SolidKind;
export type Part = 'ecken' | 'kanten' | 'flaechen';

export interface SolidFacts {
  name: string;
  /** 'der Würfel' */
  der: string;
  /** Null: no task asks for this part. */
  ecken: number | null;
  kanten: number | null;
  flaechen: number;
  /** What a child counts in the drawing if it leaves out what is dashed: the Bug `verdeckt`. */
  sichtbar: Readonly<Record<Part, number>> | null;
  rollt: boolean;
  hatSpitze: boolean;
  /** Seen from above and from the front, as the drawing stands on the table. */
  oben: Ansicht;
  vorne: Ansicht;
  /** Says what the Körper looks like without its name (srText of a naming task). */
  beschreibung: string;
  /** The worked line of each part. */
  zaehlen: Readonly<Partial<Record<Part, readonly number[]>>>;
  wo: Readonly<Partial<Record<Part, string>>>;
}

export type Ansicht = 'Kreis' | 'Quadrat' | 'Rechteck' | 'Dreieck';

const KANTIG = { ecken: 7, kanten: 9, flaechen: 3 } as const;
const BOX_ZAEHLEN = { ecken: [4, 4], kanten: [4, 4, 4], flaechen: [1, 1, 1, 1, 1, 1] } as const;
const BOX_WO = {
  ecken: 'Oben sind 4 Ecken und unten sind 4 Ecken.',
  kanten: 'Oben sind 4 Kanten, unten 4 Kanten. Dazu kommen 4 Kanten dazwischen.',
  flaechen: 'Die Flächen liegen oben, unten, vorne, hinten, links und rechts.',
} as const;

export const SOLIDS: Readonly<Record<KoerperKind, SolidFacts>> = {
  wuerfel: { name: 'Würfel', der: 'der Würfel', beschreibung: 'Alle Flächen sind gleich große Quadrate.', ecken: 8, kanten: 12, flaechen: 6, sichtbar: KANTIG, rollt: false, hatSpitze: false, oben: 'Quadrat', vorne: 'Quadrat', zaehlen: BOX_ZAEHLEN, wo: BOX_WO },
  quader: { name: 'Quader', der: 'der Quader', beschreibung: 'Die Flächen sind Rechtecke, und der Körper ist breiter als hoch.', ecken: 8, kanten: 12, flaechen: 6, sichtbar: KANTIG, rollt: false, hatSpitze: false, oben: 'Rechteck', vorne: 'Rechteck', zaehlen: BOX_ZAEHLEN, wo: BOX_WO },
  pyramide: {
    name: 'Pyramide', der: 'die Pyramide', beschreibung: 'Unten ist ein Quadrat, an den Seiten sind Dreiecke mit einer Spitze oben.', ecken: 5, kanten: 8, flaechen: 5, sichtbar: { ecken: 4, kanten: 5, flaechen: 2 }, rollt: false, hatSpitze: true, oben: 'Quadrat', vorne: 'Dreieck',
    zaehlen: { ecken: [4, 1], kanten: [4, 4], flaechen: [1, 4] },
    wo: { ecken: 'Unten sind 4 Ecken. Oben ist 1 Ecke, die Spitze.', kanten: 'Unten sind 4 Kanten. Nach oben laufen 4 Kanten.', flaechen: 'Unten ist 1 Quadrat. An den Seiten sind 4 Dreiecke.' },
  },
  kugel: {
    name: 'Kugel', der: 'die Kugel', beschreibung: 'Der Körper ist überall gleich rund, wie ein Ball.', ecken: 0, kanten: 0, flaechen: 1, sichtbar: null, rollt: true, hatSpitze: false, oben: 'Kreis', vorne: 'Kreis',
    zaehlen: {},
    wo: { ecken: 'Die Kugel ist überall rund.', kanten: 'Die Kugel ist überall rund.', flaechen: 'Die ganze Kugel ist 1 gebogene Fläche.' },
  },
  zylinder: {
    name: 'Zylinder', der: 'der Zylinder', beschreibung: 'Oben und unten ist je ein Kreis, dazwischen eine gebogene Fläche.', ecken: 0, kanten: null, flaechen: 3, sichtbar: null, rollt: true, hatSpitze: false, oben: 'Kreis', vorne: 'Rechteck',
    zaehlen: { flaechen: [1, 1, 1] },
    wo: { ecken: 'Der Zylinder hat nur runde Ränder.', flaechen: 'Oben ist 1 Kreis, unten 1 Kreis. Dazwischen ist 1 gebogene Fläche.' },
  },
  kegel: {
    name: 'Kegel', der: 'der Kegel', beschreibung: 'Unten ist ein Kreis, oben eine Spitze, dazwischen eine gebogene Fläche.', ecken: null, kanten: null, flaechen: 2, sichtbar: null, rollt: true, hatSpitze: true, oben: 'Kreis', vorne: 'Dreieck',
    zaehlen: { flaechen: [1, 1] },
    wo: { flaechen: 'Unten ist 1 Kreis. Darüber ist 1 gebogene Fläche.' },
  },
};

/** Stufe 1 of the catalogue, and with Pyramide and Kegel from Stufe 2. */
export const FIRST_SOLIDS: readonly KoerperKind[] = ['wuerfel', 'quader', 'kugel', 'zylinder'];
export const ALL_SOLIDS: readonly KoerperKind[] = [...FIRST_SOLIDS, 'pyramide', 'kegel'];

/**
 * The Körper a wrong option may name when the answer is `kind`. A Würfel is a special Quader, so a Würfel is never called wrong as a Quader.
 * `exact`: the task describes the Körper by a clue that fits both; then the Würfel is no wrong option for a Quader either.
 */
export function otherSolids(pool: readonly KoerperKind[], kind: KoerperKind, exact = false): KoerperKind[] {
  return pool.filter((k) => k !== kind && !(kind === 'wuerfel' && k === 'quader') && !(exact && kind === 'quader' && k === 'wuerfel'));
}

/** Why a chosen name does not fit the drawn Körper. */
export function whyNotSolid(chosen: KoerperKind, actual: KoerperKind): string {
  const pair = `${chosen}>${actual}`;
  const specific: Readonly<Record<string, string>> = {
    'quader>wuerfel': 'Schau auf die Kanten: Sind alle gleich lang?',
    'wuerfel>quader': 'Schau auf die Kanten: Beim Würfel sind alle gleich lang.',
    'kegel>pyramide': 'Schau auf die Grundfläche: Ein Kegel steht auf einem Kreis.',
    'pyramide>kegel': 'Schau auf die Grundfläche: Eine Pyramide hat unten Ecken.',
    'zylinder>kegel': 'Ein Zylinder hat oben und unten einen Kreis. Schau nach oben.',
    'kegel>zylinder': 'Ein Kegel hat oben eine Spitze. Schau nach oben.',
    'kugel>zylinder': 'Eine Kugel ist überall rund. Dieser Körper hat flache Kreise.',
    'kugel>kegel': 'Eine Kugel ist überall rund. Dieser Körper hat einen flachen Kreis.',
    'zylinder>kugel': 'Ein Zylinder hat flache Kreise. Dieser Körper ist überall rund.',
    'kegel>kugel': 'Ein Kegel hat eine Spitze. Dieser Körper ist überall rund.',
    'pyramide>wuerfel': 'Eine Pyramide hat oben eine Spitze. Schau nach oben.',
    'pyramide>quader': 'Eine Pyramide hat oben eine Spitze. Schau nach oben.',
    'wuerfel>pyramide': 'Ein Würfel hat 6 gleich große Quadrate. Schau auf die Flächen.',
    'quader>pyramide': 'Ein Quader hat oben keine Spitze. Schau nach oben.',
  };
  if (specific[pair]) return specific[pair];
  const s = SOLIDS[chosen];
  if (s.rollt !== SOLIDS[actual].rollt) return s.rollt ? 'Ein runder Körper kann rollen. Hat dieser Körper Ecken?' : 'Ein Körper mit Ecken rollt nicht. Schau auf die Flächen.';
  return 'Vergleiche die Flächen: Sind die Flächen rund oder eckig?';
}
