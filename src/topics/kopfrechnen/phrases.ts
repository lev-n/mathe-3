/**
 * Phrases of the misconception families of the topic 'kopfrechnen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'kopfrechnen-nullen': { phrase: { object: 'die Nullen', participle: 'richtig gesetzt' } },
  'kopfrechnen-uebergang': { phrase: { object: 'den Übergang zur nächsten Stelle', participle: 'beachtet' } },
  'kopfrechnen-minus-schritte': { phrase: { object: 'Minus über eine volle Zahl', participle: 'in Schritten gerechnet' } },
  'kopfrechnen-rechenzeichen': { phrase: { object: 'das Rechenzeichen', participle: 'beachtet' } },
  'kopfrechnen-luecke': { phrase: { object: 'die Zahl in der Lücke', participle: 'richtig gefunden' } },
  'kopfrechnen-paeckchen': { phrase: { object: 'das Muster im Päckchen', participle: 'fortgesetzt' } },
  'kopfrechnen-stelle': { phrase: { object: 'die richtige Stelle', participle: 'geändert' } },
  'kopfrechnen-ergaenzen': { phrase: { object: 'Zehner und Einer', participle: 'richtig ergänzt' } },
  'kopfrechnen-ziel': { phrase: { object: 'bis zur richtigen Zahl', participle: 'ergänzt' } },
  'kopfrechnen-nachbarfakt': { phrase: { object: 'die genaue Malaufgabe', participle: 'gefunden' } },
  'kopfrechnen-mal-plus': { phrase: { object: 'mal und plus', participle: 'unterschieden' } },
  'kopfrechnen-mal-null': { phrase: { object: 'die Aufgabe mit der Null', participle: 'richtig gelöst' } },
  'kopfrechnen-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'kopfrechnen-nachbaraufgabe': { phrase: { object: 'die Nachbaraufgabe', participle: 'richtig genutzt' } },
  'kopfrechnen-verdoppeln': { phrase: { object: 'das Ergebnis', participle: 'richtig verdoppelt' } },
  'kopfrechnen-zerlegen': { phrase: { object: 'alle Teile der Zerlegung', participle: 'mitgerechnet' } },
  'kopfrechnen-abgeschrieben': { phrase: { object: 'die fehlende Zahl', participle: 'selbst ausgerechnet' } },
  'kopfrechnen-familie': { phrase: { object: 'die Aufgabenfamilie', participle: 'richtig ergänzt' } },
  'kopfrechnen-richtung': { phrase: { object: 'an größer und kleiner', participle: 'gedacht' } },
  'kopfrechnen-rest-groesse': { phrase: { object: 'den passenden Rest', participle: 'gefunden' } },
  'kopfrechnen-rest-beachten': { phrase: { object: 'den Rest', participle: 'mitgerechnet' } },
  'kopfrechnen-rest-reihenfolge': { phrase: { object: 'Ergebnis und Rest', participle: 'richtig eingetragen' } },
  'kopfrechnen-mal-zuerst': { phrase: { object: 'die Malaufgabe', participle: 'zuerst gerechnet' } },
};

export default phrases;
