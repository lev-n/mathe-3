/**
 * Phrases of the misconception families of the topic 'geometrie':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'geometrie-flaeche-umfang': { phrase: { object: 'Fläche und Umfang', participle: 'unterschieden' } },
  'geometrie-umfang-halb': { phrase: { object: 'beim Umfang alle 4 Seiten', participle: 'mitgezählt' } },
  'geometrie-umfang-kaestchen': { phrase: { object: 'beim Umfang die Kanten am Rand', participle: 'gezählt' } },
  'geometrie-umfang-luecke': { phrase: { object: 'beim Umfang auch die Kanten in der Lücke', participle: 'mitgezählt' } },
  'geometrie-gleicher-umfang': { phrase: { object: 'den Umfang jeder Figur', participle: 'selbst bestimmt' } },
  'geometrie-flaeche-plus': { phrase: { object: 'alle Reihen eines Rechtecks', participle: 'gezählt' } },
  'geometrie-flaeche-rand': { phrase: { object: 'auch die Kästchen innen', participle: 'mitgezählt' } },
  'geometrie-flaeche-ganzes': { phrase: { object: 'das fehlende Stück einer Figur', participle: 'beachtet' } },
  'geometrie-flaeche-vergleich': { phrase: { object: 'den Unterschied von 2 Figuren', participle: 'bestimmt' } },
  'geometrie-halbe-kaestchen': { phrase: { object: 'halbe Kästchen', participle: 'richtig zusammengelegt' } },
  'geometrie-verdeckte-wuerfel': { phrase: { object: 'auch die verdeckten Würfel', participle: 'mitgezählt' } },
  'geometrie-nur-verdeckte': { phrase: { object: 'nur die verdeckten Würfel', participle: 'gezählt' } },
  'geometrie-tuerme-gezaehlt': { phrase: { object: 'die Höhe jedes Turms', participle: 'beachtet' } },
  'geometrie-bauplan-reihe': { phrase: { object: 'im Bauplan die richtige Reihe', participle: 'gefunden' } },
  'geometrie-quader-fehlend': { phrase: { object: 'die fehlenden Würfel zum Quader', participle: 'bestimmt' } },
  'geometrie-koerper-verdeckt': { phrase: { object: 'auch die verdeckten Teile eines Körpers', participle: 'mitgezählt' } },
  'geometrie-ecken-kanten': { phrase: { object: 'Ecken, Kanten und Flächen', participle: 'unterschieden' } },
  'geometrie-koerper-liste': { phrase: { object: 'jeden Körper einzeln', participle: 'geprüft' } },
  'geometrie-rechte-winkel': { phrase: { object: 'rechte Winkel und andere Ecken', participle: 'unterschieden' } },
  'geometrie-quadrat-rechteck': { phrase: { object: 'Quadrate und Rechtecke zusammen', participle: 'gezählt' } },
  'geometrie-figuren-sortieren': { phrase: { object: 'jede Figur einzeln', participle: 'geprüft' } },
  'geometrie-ecken-addieren': { phrase: { object: 'die Ecken aller Figuren', participle: 'gezählt' } },
  'geometrie-seitenpaare': { phrase: { object: 'parallele Seitenpaare', participle: 'gezählt' } },
  'geometrie-netz-gegenueber': { phrase: { object: 'die Fläche gegenüber', participle: 'im Kopf gefunden' } },
  'geometrie-wuerfel-sieben': { phrase: { object: 'beim Spielwürfel die Zahl gegenüber', participle: 'bis 7 ergänzt' } },
  'geometrie-achsen-diagonal': { phrase: { object: 'eine Figur auch über Eck', participle: 'geprüft' } },
  'geometrie-achsen-richtung': { phrase: { object: 'eine Figur in beide Richtungen', participle: 'gefaltet' } },
};

export default phrases;
