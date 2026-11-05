/**
 * Phrases of the misconception families of the topic 'zahlen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const say = (object: string, participle: string): FamilyPhrases => ({ phrase: { object, participle } });

const phrases: Record<string, FamilyPhrases> = {
  'zahlen-null': say('die Null an der richtigen Stelle', 'geschrieben'),
  'zahlen-reihenfolge': say('die Reihenfolge der Stellen', 'beachtet'),
  'zahlen-dreher': say('Zehner und Einer', 'richtig zugeordnet'),
  'zahlen-material': say('den Wert der Teile', 'beachtet'),
  'zahlen-buendeln': say('das Bündeln', 'richtig gemacht'),
  'zahlen-entbuendeln': say('das Tauschen in kleinere Teile', 'richtig gemacht'),
  'zahlen-teile': say('die Anzahl der Teile', 'richtig bestimmt'),
  'zahlen-stellenwert': say('den Wert einer Ziffer', 'richtig bestimmt'),
  'zahlen-zahlwort-stellen': say('ein Zahlwort mit den richtigen Stellen', 'geschrieben'),
  'zahlen-schrittgroesse': say('die Schritte beim Zählen', 'beachtet'),
  'zahlen-zaehlrichtung': say('die Richtung beim Zählen', 'beachtet'),
  'zahlen-hunderter-uebergang': say('den Schritt über den Hunderter', 'richtig gemacht'),
  'zahlen-nachbarn': say('die Nachbarn einer Zahl', 'richtig zugeordnet'),
  'zahlen-nachbar-stelle': say('die Nachbarn an der gefragten Stelle', 'gefunden'),
  'zahlen-raetsel': say('die Hinweise im Zahlenrätsel', 'richtig genutzt'),
  'zahlen-ordnen': say('die Richtung beim Ordnen', 'beachtet'),
  'zahlen-vergleich': say('Zahlen zuerst bei den Hundertern', 'verglichen'),
  'zahlen-strahl-schritt': say('die Schritte am Zahlenstrahl', 'richtig gelesen'),
  'zahlen-strahl-richtung': say('den Anfang des Zahlenstrahls', 'beachtet'),
  'zahlen-runden-richtung': say('die Richtung beim Runden', 'richtig gewählt'),
  'zahlen-runden-stelle': say('auf die gefragte Stelle', 'gerundet'),
  'zahlen-runden-uebergang': say('über den Hunderter', 'gerundet'),
  'zahlen-runden-grenze': say('die Grenze beim Runden', 'gefunden'),
  'zahlen-tausenderbuch-schritt': say('die Schritte im Tausenderbuch', 'richtig gerechnet'),
  'zahlen-unpassende-zahl': say('die unpassende Zahl', 'ersetzt'),
};

export default phrases;
