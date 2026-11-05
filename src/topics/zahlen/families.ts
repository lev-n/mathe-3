/**
 * Misconception families of the topic 'zahlen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'zahlen-null': { 'zahlen.stellenwerte': 'null-vergessen null-falsche-stelle', 'zahlen.zahlwort': 'null-vergessen null-falsche-stelle' },
  'zahlen-reihenfolge': { 'zahlen.buendeln': 'stellen-reihenfolge', 'zahlen.stellenwerte': 'stellen-reihenfolge' },
  'zahlen-dreher': { 'zahlen.buendeln': 'zahlendreher', 'zahlen.stellenwerte': 'zahlendreher', 'zahlen.zahlwort': 'zahlendreher' },
  'zahlen-material': { 'zahlen.buendeln': 'teile-gezaehlt' },
  'zahlen-buendeln': { 'zahlen.buendeln': 'buendeln nicht-gebuendelt' },
  'zahlen-entbuendeln': { 'zahlen.buendeln': 'nicht-getauscht falsche-stelle' },
  'zahlen-teile': { 'zahlen.buendeln': 'nicht-wenigste platten-statt-zahl' },
  'zahlen-stellenwert': { 'zahlen.stellenwerte': 'ziffer-statt-wert falscher-wert' },
  'zahlen-zahlwort-stellen': { 'zahlen.zahlwort': 'zahlwort-anhaengen' },
  'zahlen-schrittgroesse': { 'zahlen.zaehlen': 'schritt-falsch' },
  'zahlen-zaehlrichtung': { 'zahlen.zaehlen': 'richtung' },
  'zahlen-hunderter-uebergang': { 'zahlen.zaehlen': 'zaehlen-hunderter zehner-ueber-hundert', 'zahlen.nachbarn': 'zaehlen-hunderter zehner-ueber-hundert', 'zahlen.tausenderbuch': 'zaehlen-hunderter' },
  'zahlen-nachbarn': { 'zahlen.nachbarn': 'vertauscht zehner-statt-einer' },
  'zahlen-nachbar-stelle': { 'zahlen.nachbarn': 'falsche-stelle' },
  'zahlen-raetsel': { 'zahlen.nachbarn': 'nachbar-statt-zahl' },
  'zahlen-ordnen': { 'zahlen.vergleichen': 'reihenfolge-umgekehrt' },
  'zahlen-vergleich': { 'zahlen.vergleichen': 'vergleich-ziffern' },
  'zahlen-strahl-schritt': { 'zahlen.zahlenstrahl': 'strahl-schritt' },
  'zahlen-strahl-richtung': { 'zahlen.zahlenstrahl': 'strahl-richtung' },
  'zahlen-runden-richtung': { 'zahlen.runden': 'runden-abschneiden runden-aufrunden' },
  'zahlen-runden-stelle': { 'zahlen.runden': 'runden-stelle runden-kette nicht-gerundet' },
  'zahlen-runden-uebergang': { 'zahlen.runden': 'runden-uebergang' },
  'zahlen-runden-grenze': { 'zahlen.runden': 'runden-grenze' },
  'zahlen-tausenderbuch-schritt': { 'zahlen.tausenderbuch': 'zeile-spalte' },
  'zahlen-unpassende-zahl': { 'zahlen.tausenderbuch': 'zahl-schon-da' },
};

export default families;
