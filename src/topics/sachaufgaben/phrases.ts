/**
 * Phrases of the misconception families of the topic 'sachaufgaben':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'sachaufgaben-rechenart': { phrase: { object: 'die passende Rechnung zur Geschichte', participle: 'gefunden' } },
  'sachaufgaben-signalwort': { phrase: { object: 'dir die Geschichte', participle: 'genau vorgestellt' } },
  'sachaufgaben-alle-zahlen': { phrase: { object: 'die passenden Zahlen', participle: 'ausgewählt' } },
  'sachaufgaben-angaben': { phrase: { object: 'die Angaben in der Geschichte', participle: 'geprüft' } },
  'sachaufgaben-nullen': { phrase: { object: 'die Null bei den Zehnern', participle: 'beachtet' } },
  'sachaufgaben-unterschied': { phrase: { object: 'den Unterschied beim Vergleichen', participle: 'gefunden' } },
  'sachaufgaben-mal-als-mehr': { phrase: { object: 'das Wort „mal“', participle: 'richtig gedeutet' } },
  'sachaufgaben-rest-sache': { phrase: { object: 'den Rest in der Geschichte', participle: 'richtig gedeutet' } },
  'sachaufgaben-unsinnig-gross': { phrase: { object: 'dein Ergebnis an der echten Sache', participle: 'geprüft' } },
  'sachaufgaben-geld-rechnen': { phrase: { object: 'Euro und Cent in der Geschichte', participle: 'richtig gerechnet' } },
  'sachaufgaben-einheit-gemischt': { phrase: { object: 'die Einheiten', participle: 'zuerst umgerechnet' } },
  'sachaufgaben-zeitspanne': { phrase: { object: 'die Stunde', participle: 'mit 60 Minuten gerechnet' } },
  'sachaufgaben-nur-erster-schritt': { phrase: { object: 'auch den letzten Schritt', participle: 'gerechnet' } },
  'sachaufgaben-menge-preis': { phrase: { object: 'den Preis passend zur Menge', participle: 'verändert' } },
  'sachaufgaben-je-mehr-weniger': { phrase: { object: 'die Zeit zur Anzahl', participle: 'passend gerechnet' } },
};

export default phrases;
