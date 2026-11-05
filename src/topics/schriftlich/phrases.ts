/**
 * Phrases of the misconception families of the topic 'schriftlich':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 * A family holds the tasks of both subtraction methods, so a phrase speaks neither method's Sprechweise (T12).
 */
import type { FamilyPhrases } from '../errorPhrases';

const say = (object: string, participle: string): FamilyPhrases => ({ phrase: { object, participle } });

const phrases: Record<string, FamilyPhrases> = {
  'schriftlich-stellen': say('Einer unter Einer', 'richtig geschrieben'),
  'schriftlich-von-rechts': say('bei den Einern', 'richtig angefangen'),
  'schriftlich-uebertrag-plus': say('den Übertrag', 'mitgerechnet'),
  'schriftlich-letzter-uebertrag': say('den letzten Übertrag', 'vorne hingeschrieben'),
  'schriftlich-uebertrag-null': say('den Übertrag bei der 0', 'mitgerechnet'),
  'schriftlich-kein-uebertrag': say('bei genau 9', 'keinen Übertrag geschrieben'),
  'schriftlich-null-plus': say('die Ziffer neben der 0', 'richtig behalten'),
  'schriftlich-oben-unten': say('die kleine Ziffer oben', 'richtig beachtet'),
  'schriftlich-uebertrag-minus': say('den Übertrag beim Minus', 'richtig beachtet'),
  'schriftlich-null-oben': say('die 0 oben', 'richtig gerechnet'),
  'schriftlich-null-unten': say('die 0 unten', 'richtig gerechnet'),
  'schriftlich-ueber-null': say('die Spalten rund um die 0', 'richtig gerechnet'),
  'schriftlich-rechenzeichen': say('das Rechenzeichen', 'beachtet'),
  'schriftlich-gleiche-ziffern': say('gleiche Ziffern', 'richtig gerechnet'),
  'schriftlich-stellenzahl': say('den Übertrag vor der leeren Stelle', 'mitgerechnet'),
  'schriftlich-mal-uebertrag': say('den Übertrag beim Mal', 'mitgerechnet'),
  'schriftlich-luecke': say('die fehlende Ziffer', 'richtig gefunden'),
  'schriftlich-runden': say('zum nächsten Hunderter', 'richtig gerundet'),
  'schriftlich-nachbarzahl': say('die volle Nachbarzahl', 'richtig ausgeglichen'),
  'schriftlich-volle-zahl': say('von der vollen Zahl', 'richtig minus gerechnet'),
};

export default phrases;
