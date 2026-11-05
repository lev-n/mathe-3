/**
 * Phrases of the misconception families of the topic 'daten':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'daten-zeile-spalte': { phrase: { object: 'die passende Zeile und Spalte', participle: 'gefunden' } },
  'daten-unterschied': { phrase: { object: 'den Unterschied', participle: 'ausgerechnet' } },
  'daten-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'daten-alle-werte': { phrase: { object: 'genau die passenden Zahlen', participle: 'mitgerechnet' } },
  'daten-teil-ganzes': { phrase: { object: 'den fehlenden Teil', participle: 'ausgerechnet' } },
  'daten-angabe-fehlt': { phrase: { object: 'die Angaben der Tabelle', participle: 'geprüft' } },
  'daten-achse': { phrase: { object: 'die Schritte an der Achse', participle: 'beachtet' } },
  'daten-legende': { phrase: { object: 'die Legende im Bilddiagramm', participle: 'benutzt' } },
  'daten-strichliste': { phrase: { object: 'die Bündel in der Strichliste', participle: 'richtig gerechnet' } },
  'daten-abschreiben': { phrase: { object: 'die Zahl selbst', participle: 'nachgeschaut' } },
  'daten-fahrzeit': { phrase: { object: 'die Fahrzeit über die volle Stunde', participle: 'gerechnet' } },
  'daten-cent': { phrase: { object: 'den neuen Euro aus den Cent', participle: 'mitgerechnet' } },
  'daten-kombinieren': { phrase: { object: 'alle Paare', participle: 'mitgezählt' } },
  'daten-reihenfolge': { phrase: { object: 'alle Reihenfolgen', participle: 'gefunden' } },
  'daten-chancen-ordnen': { phrase: { object: 'die Chancen', participle: 'in die passende Reihenfolge gebracht' } },
};

export default phrases;
