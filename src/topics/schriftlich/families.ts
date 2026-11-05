/**
 * Misconception families of the topic 'schriftlich'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * Both subtraction methods emit the same keys, so a tag stays the same when the setting changes.
 */
import type { TopicFamilies } from '../errorFamilies';

const LINE = 'schriftlich.stellengerecht';
const ADD = 'schriftlich.addieren';
const CARRY = 'schriftlich.addieren-uebertrag';
const SUB = 'schriftlich.subtrahieren';
const REGROUP = 'schriftlich.subtrahieren-uebertrag';
const ZERO = 'schriftlich.null';
const CHECK = 'schriftlich.pruefen';
const WAY = 'schriftlich.kopf-oder-schriftlich';
const MUL = 'schriftlich.multiplizieren';

const families: TopicFamilies = {
  'schriftlich-stellen': { [LINE]: 'nicht-stellengerecht', [ADD]: 'nicht-stellengerecht', [CARRY]: 'nicht-stellengerecht', [SUB]: 'nicht-stellengerecht', [REGROUP]: 'nicht-stellengerecht', [CHECK]: 'nicht-stellengerecht' },
  'schriftlich-von-rechts': { [CARRY]: 'von-links', [CHECK]: 'von-links' },
  'schriftlich-uebertrag-plus': { [CARRY]: 'uebertrag-vergessen', [CHECK]: 'uebertrag-vergessen' },
  'schriftlich-letzter-uebertrag': { [CARRY]: 'leerstelle' },
  'schriftlich-uebertrag-null': { [CARRY]: 'uebertrag-zur-null', [CHECK]: 'uebertrag-zur-null', [MUL]: 'uebertrag-zur-null' },
  'schriftlich-kein-uebertrag': { [ADD]: 'uebertrag-zu-viel', [CARRY]: 'uebertrag-zu-viel', [CHECK]: 'uebertrag-zu-viel' },
  'schriftlich-null-plus': { [ADD]: 'null-plus', [CHECK]: 'null-plus' },
  'schriftlich-oben-unten': { [REGROUP]: 'kleiner-von-groesser', [ZERO]: 'kleiner-von-groesser', [CHECK]: 'kleiner-von-groesser' },
  'schriftlich-uebertrag-minus': { [REGROUP]: 'uebertrag-minus', [ZERO]: 'uebertrag-minus', [CHECK]: 'uebertrag-minus' },
  'schriftlich-null-oben': { [ZERO]: 'null-minus', [CHECK]: 'null-minus' },
  'schriftlich-null-unten': { [SUB]: 'minus-null', [REGROUP]: 'minus-null', [ZERO]: 'minus-null', [CHECK]: 'minus-null' },
  'schriftlich-ueber-null': { [ZERO]: 'ueber-die-null', [CHECK]: 'ueber-die-null' },
  'schriftlich-rechenzeichen': { [SUB]: 'plus-statt-minus', [REGROUP]: 'plus-statt-minus', [ZERO]: 'plus-statt-minus', [CHECK]: 'plus-statt-minus', [MUL]: 'rechenzeichen' },
  'schriftlich-gleiche-ziffern': { [SUB]: 'gleiche-ziffern', [REGROUP]: 'gleiche-ziffern', [ZERO]: 'gleiche-ziffern', [CHECK]: 'gleiche-ziffern' },
  'schriftlich-stellenzahl': { [REGROUP]: 'stellenzahl' },
  'schriftlich-mal-uebertrag': { [MUL]: 'mal-uebertrag' },
  'schriftlich-luecke': { [ADD]: 'luecke-rechnung', [SUB]: 'luecke-rechnung' },
  'schriftlich-runden': { [CHECK]: 'runden-abschneiden' },
  'schriftlich-nachbarzahl': { [WAY]: 'nachbar-vergessen nachbar-richtung' },
  'schriftlich-volle-zahl': { [WAY]: 'ergaenzen-1000' },
};

export default families;
