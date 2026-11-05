/**
 * Phrases of the misconception families of the topic 'groessen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'groessen-geld-stellen': { phrase: { object: 'die 2 Stellen nach dem Komma', participle: 'richtig gelesen' } },
  'groessen-geld-einheiten': { phrase: { object: 'Euro und Cent', participle: 'richtig getrennt' } },
  'groessen-einkauf-cent': { phrase: { object: 'alle Cent beim Einkauf', participle: 'mitgerechnet' } },
  'groessen-rueckgeld': { phrase: { object: 'das Rückgeld mit Cent', participle: 'richtig gerechnet' } },
  'groessen-einkauf-frage': { phrase: { object: 'die Frage beim Einkaufen', participle: 'genau beachtet' } },
  'groessen-lineal': { phrase: { object: 'das Lineal', participle: 'genau abgelesen' } },
  'groessen-laengen-umwandeln': { phrase: { object: 'Millimeter, Zentimeter und Meter', participle: 'richtig umgewandelt' } },
  'groessen-laengen-komma': { phrase: { object: 'Meter mit Komma', participle: 'richtig gelesen' } },
  'groessen-laengen-einheiten': { phrase: { object: 'die Einheiten bei Längen', participle: 'beachtet' } },
  'groessen-km-umwandeln': { phrase: { object: 'Kilometer', participle: 'richtig in Meter umgewandelt' } },
  'groessen-km-komma': { phrase: { object: 'halbe Kilometer und Kilometer mit Komma', participle: 'richtig gelesen' } },
  'groessen-km-einheiten': { phrase: { object: 'Kilometer und Meter', participle: 'getrennt gerechnet' } },
  'groessen-km-fehlt': { phrase: { object: 'den fehlenden Weg bis 1 km', participle: 'gefunden' } },
  'groessen-uhr-zeiger': { phrase: { object: 'kurzen und langen Zeiger', participle: 'richtig gelesen' } },
  'groessen-uhr-minuten': { phrase: { object: 'die Minuten am langen Zeiger', participle: 'genau abgelesen' } },
  'groessen-uhr-nachmittag': { phrase: { object: 'die Uhrzeit nach 12 Uhr', participle: 'richtig geschrieben' } },
  'groessen-uhr-tageszeit': { phrase: { object: 'die Tageszeit beim Lesen der Uhr', participle: 'beachtet' } },
  'groessen-zeit-stunde': { phrase: { object: 'an die 60 Minuten pro Stunde', participle: 'gedacht' } },
  'groessen-zeit-spanne': { phrase: { object: 'Uhrzeit und Dauer', participle: 'richtig unterschieden' } },
  'groessen-zeit-einheiten': { phrase: { object: 'Stunden, Minuten und Sekunden', participle: 'richtig umgewandelt' } },
  'groessen-gewicht-umwandeln': { phrase: { object: 'Kilogramm und Gramm', participle: 'richtig umgewandelt' } },
  'groessen-gewicht-skala': { phrase: { object: 'die Striche auf der Waage', participle: 'richtig gelesen' } },
  'groessen-gewicht-halb': { phrase: { object: 'ein halbes Kilogramm', participle: 'richtig umgewandelt' } },
  'groessen-liter-umwandeln': { phrase: { object: 'Liter und Milliliter', participle: 'richtig umgewandelt' } },
  'groessen-liter-skala': { phrase: { object: 'die Striche am Messbecher', participle: 'richtig gelesen' } },
  'groessen-liter-becher': { phrase: { object: 'das Umfüllen in Becher', participle: 'richtig gerechnet' } },
};

export default phrases;
