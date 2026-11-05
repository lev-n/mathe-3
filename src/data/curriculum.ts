/**
 * Curriculum tags for Klasse 3 (docs/research.md §2). The KMK Bildungsstandards (i. d. F. vom 23.06.2022) describe the end of
 * Jahrgangsstufe 4 and set no Klasse-3 waypoint: they give the Leitideen and the process competences as a frame, while the scope
 * comes from the Länder curricula. Tags are paraphrased content foci in that frame.
 *
 * Every generator references the tag ids and the shared tests check them (isKmkTag): never rename or remove an id.
 */
import type { TopicId } from '../core/types';

export type Leitidee =
  | 'Zahl und Operation'
  | 'Raum und Form'
  | 'Muster, Strukturen und funktionaler Zusammenhang'
  | 'Größen und Messen'
  | 'Daten und Zufall';

export interface KmkTag {
  leitidee: Leitidee | 'Prozessbezogene Kompetenz';
  text: string;
}

export const KMK_TAGS = {
  'ZO.zahlraum': { leitidee: 'Zahl und Operation', text: 'Zahlen bis 1000 darstellen, ordnen und vergleichen; im Zahlenraum orientieren (Zahlenstrahl, Tausenderbuch, Nachbarzahlen)' },
  'ZO.stellenwert': { leitidee: 'Zahl und Operation', text: 'Bündeln und Stellenwerte nutzen: Hunderter, Zehner und Einer; die Bedeutung der Null' },
  'ZO.runden': { leitidee: 'Zahl und Operation', text: 'Auf Zehner und Hunderter runden' },
  'ZO.kopfrechnen': { leitidee: 'Zahl und Operation', text: 'Plus und Minus bis 1000 im Kopf und in Schritten rechnen, analoge Aufgaben nutzen, ergänzen' },
  'ZO.schriftlich': { leitidee: 'Zahl und Operation', text: 'Schriftliche Addition und Subtraktion verstehen und ausführen, auch mit Übertrag' },
  'ZO.schriftlich-mal': { leitidee: 'Zahl und Operation', text: 'Schriftliche Multiplikation mit einem einstelligen Faktor (Sachsen)' },
  'ZO.einmaleins': { leitidee: 'Zahl und Operation', text: 'Das kleine Einmaleins und seine Umkehrungen gedächtnismäßig und flexibel beherrschen' },
  'ZO.zehnereinmaleins': { leitidee: 'Zahl und Operation', text: 'Malnehmen und Teilen mit Zehnerzahlen, auf analoge Aufgaben übertragen' },
  'ZO.halbschriftlich': { leitidee: 'Zahl und Operation', text: 'Halbschriftlich malnehmen und teilen: zerlegen und in Schritten rechnen' },
  'ZO.rest': { leitidee: 'Zahl und Operation', text: 'Teilen mit Rest; den Rest am Sachverhalt klären' },
  'ZO.terme': { leitidee: 'Zahl und Operation', text: 'Terme mit mehreren Rechenarten: Mal vor Plus und Minus (Sachsen)' },
  'ZO.schaetzen': { leitidee: 'Zahl und Operation', text: 'Überschlagen und Ergebnisse ungefähr einschätzen' },
  'ZO.kontrolle': { leitidee: 'Zahl und Operation', text: 'Ergebnisse mit Überschlag und Umkehraufgabe prüfen; Rechenfehler finden und berichtigen' },
  'ZO.sachrechnen': { leitidee: 'Zahl und Operation', text: 'Rechenoperationen in Sachsituationen anwenden, auch in zwei Schritten; Ergebnisse auf Plausibilität prüfen' },
  'MS.muster': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Muster und Strukturen erkennen und fortsetzen (Zahlenfolgen, Bandornamente, Aufgabenfamilien, strukturierte Päckchen)' },
  'MS.funktional': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Einfache funktionale Zusammenhänge erkennen und nutzen (je mehr, desto mehr; Tabellen zu Menge und Preis)' },
  'RF.raum': { leitidee: 'Raum und Form', text: 'Sich im Raum orientieren: Würfelgebäude, Baupläne und Ansichten' },
  'RF.figuren': { leitidee: 'Raum und Form', text: 'Ebene Figuren erkennen und benennen, rechte Winkel finden; Parallelogramm (Sachsen)' },
  'RF.linien': { leitidee: 'Raum und Form', text: 'Parallele und senkrechte Linien erkennen' },
  'RF.koerper': { leitidee: 'Raum und Form', text: 'Körper erkennen und beschreiben: Würfel, Quader, Kugel, Zylinder, Kegel, Pyramide; Ecken, Kanten, Flächen' },
  'RF.netze': { leitidee: 'Raum und Form', text: 'Würfelnetze und Quadernetze erkennen; im Kopf falten' },
  'RF.symmetrie': { leitidee: 'Raum und Form', text: 'Achsensymmetrie erkennen, Spiegelachse finden und Figuren ergänzen' },
  'RF.flaeche': { leitidee: 'Raum und Form', text: 'Flächen mit Kästchen auslegen und vergleichen, Umfang am Gitter bestimmen, ohne Formel' },
  'GM.vorstellung': { leitidee: 'Größen und Messen', text: 'Größenvorstellungen besitzen: Stützpunkte wie 1 km, 1 kg, die Packung Mehl; Plausibilität' },
  'GM.einheiten': { leitidee: 'Größen und Messen', text: 'Einheiten kennen und umwandeln, gemischte Schreibweise und Kommaschreibweise nutzen' },
  'GM.geld': { leitidee: 'Größen und Messen', text: 'Euro und Cent mit Komma: Beträge schreiben, vergleichen, rechnen, Rückgeld' },
  'GM.laenge': { leitidee: 'Größen und Messen', text: 'Längen in mm, cm, m und km messen, vergleichen und umwandeln' },
  'GM.zeit': { leitidee: 'Größen und Messen', text: 'Uhrzeiten auf die Minute lesen, Zeitspannen bestimmen; Sekunden' },
  'GM.gewicht': { leitidee: 'Größen und Messen', text: 'Gewichte in g und kg wiegen, vergleichen und umwandeln' },
  'GM.hohlmasse': { leitidee: 'Größen und Messen', text: 'Rauminhalte in l und ml messen und umwandeln' },
  'GM.sachsituationen': { leitidee: 'Größen und Messen', text: 'Mit Größen in Sachsituationen rechnen' },
  'DZ.daten': { leitidee: 'Daten und Zufall', text: 'Daten aus Strichlisten, Tabellen, Säulen- und Balkendiagrammen und Fahrplänen entnehmen und übertragen' },
  'DZ.kombinatorik': { leitidee: 'Daten und Zufall', text: 'Anzahl von Möglichkeiten systematisch bestimmen, auch mit Baumdiagramm' },
  'DZ.zufall': { leitidee: 'Daten und Zufall', text: 'Zufallsereignisse mit sicher, möglich, unmöglich beschreiben; Chancen vergleichen, ohne Zahlenwerte' },
  'PK.argumentieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch argumentieren (Aussagen prüfen, begründen)' },
  'PK.modellieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch modellieren (Sachsituation und Rechnung verbinden)' },
  'PK.problemloesen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Probleme mathematisch lösen (Knobelaufgaben, systematisches Probieren)' },
  'PK.darstellen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematische Darstellungen verwenden und wechseln' },
} as const satisfies Record<string, KmkTag>;

export type KmkTagId = keyof typeof KMK_TAGS;

export function isKmkTag(id: string): id is KmkTagId {
  return Object.prototype.hasOwnProperty.call(KMK_TAGS, id);
}

/**
 * Where each topic sits in the curricula (shown on the page for parents and teachers). Bayern, NRW and Baden-Württemberg fix only the end
 * of Klasse 4; Sachsen alone has a binding Klassenstufe 3 (docs/research.md §2.1).
 */
export const TOPIC_ALIGNMENT: Record<TopicId, { kmk: Leitidee[]; bayern: string; nrw: string; sachsen: string }> = {
  zahlen: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 3/4, Lernbereich 1.1: bis zur Million; der Lehrerband zu Klasse 3 arbeitet bis 1000',
    nrw: 'Ende Klasse 4, Zahlverständnis: bis 1 000 000; Schulpläne für Klasse 3 arbeiten bis 1000',
    sachsen: 'Klassenstufe 3: Zahlenraum bis 1000, Stellenwerttafel, Nachbarzehner und -hunderter, Runden',
  },
  schriftlich: {
    kmk: ['Zahl und Operation'],
    bayern: 'Jgst. 3/4, Lernbereich 1.2: Addition und Subtraktion automatisiert, Subtraktion als Abziehverfahren',
    nrw: 'Ende Klasse 4, Ziffernrechnen: Addition und Subtraktion sicher; kein Verfahren vorgeschrieben',
    sachsen: 'Klassenstufe 3, Kennen: Addition mit bis zu drei Summanden, Subtraktion, Multiplikation dreistellig mal einstellig',
  },
  kopfrechnen: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'Jgst. 3/4, Lernbereich 1.2: Einmaleins automatisiert und flexibel, analoge Aufgaben; Teilen mit Rest',
    nrw: 'Ende Klasse 4, Kopfrechnen und Zahlenrechnen: alle Zahlensätze des Einmaleins automatisiert, halbschriftlich rechnen',
    sachsen: 'Klassenstufe 3: Einmaleins automatisiert, Vielfache von 10, Teilen mit Rest, Vorrangregel',
  },
  groessen: {
    kmk: ['Größen und Messen'],
    bayern: 'Jgst. 3/4, Lernbereiche 3.1 bis 3.3: Euro und Cent mit Komma, km und mm, kg und g, Sekunden',
    nrw: 'Ende Klasse 4, Größen und Messen: rechnen mit Größen, auch mit Dezimalzahlen; Stützpunkte',
    sachsen: 'Klassenstufe 3: Kilometer, Kommaschreibweise, g und kg, Uhrzeit auf die Minute, Zeitspannen',
  },
  geometrie: {
    kmk: ['Raum und Form'],
    bayern: 'Jgst. 3/4, Lernbereiche 2.1 bis 2.4: Würfel- und Quadernetze, rechter Winkel, Achsensymmetrie, Bandornamente',
    nrw: 'Ende Klasse 4, Raum und Form: Würfelnetze, parallel und senkrecht, Fläche und Umfang auslegen, Symmetrie',
    sachsen: 'Klassenstufe 3: Pyramide, Kegel, Zylinder, Netze, parallel und senkrecht, Einblick in Fläche und Umfang',
  },
  daten: {
    kmk: ['Daten und Zufall'],
    bayern: 'Jgst. 3/4, Lernbereiche 1.3, 4.1, 4.2: Balkendiagramm, Fahrpläne, Kombinieren mit Baumdiagramm, Glücksrad',
    nrw: 'Ende Klasse 4, Daten und Wahrscheinlichkeiten: Diagramme, Tabellen, sicher, möglich, unmöglich',
    sachsen: 'Klassenstufe 3: Säulen- und Balkendiagramme, Fahrplan, Urne, Glücksrad, Tachometerprinzip',
  },
  sachaufgaben: {
    kmk: ['Zahl und Operation', 'Größen und Messen'],
    bayern: 'Jgst. 3/4, Lernbereiche 1.3, 3.3: mehrschrittige Aufgaben, je mehr, desto mehr, Überschlag',
    nrw: 'Ende Klasse 4, Sachsituationen: Skizzen, Tabellen, Näherungswerte',
    sachsen: 'Klassenstufe 3: Lösungsansätze, Skizzen, einfache funktionale Beziehungen, den Rest am Sachverhalt klären',
  },
};

/** Where the Länder differ at this level, and what the app does about it (docs/research.md §2.3; for the page for adults). */
export const LAENDER_DIFFERENCES: readonly { topic: string; text: string }[] = [
  { topic: 'Schriftliche Subtraktion', text: 'Bayern schreibt das Abziehen vor, Baden-Württemberg erlaubt Abziehen oder Ergänzen, NRW nennt kein Verfahren, und in Berlin-Brandenburg müssen nicht beide vorkommen. Deshalb fragt die App einmal nach dem Verfahren und mischt die beiden nie.' },
  { topic: 'Schriftliches Malnehmen', text: 'Nur Sachsen sieht es in Klasse 3 vor, dreistellig mal einstellig. Deshalb ist es ein Extra.' },
  { topic: 'Schriftliches Teilen', text: 'Steht in keinem gelesenen Plan für Klasse 3. Deshalb gibt es hier nur das Teilen in Schritten.' },
  { topic: 'Tausenderbuch', text: 'Kommt in einem Schulplan aus NRW vor, der bayerische und der sächsische Plan nennen es nicht. Deshalb ist es ein Extra.' },
  { topic: 'Mal zuerst', text: 'Sachsen nennt die Vorrangregel in Klasse 3, Berlin-Brandenburg rechnet Terme mit mehreren Rechenarten. Bayern und NRW nennen sie nicht. Deshalb ist es ein Extra.' },
  { topic: 'Liter und Milliliter', text: 'Keine gelesene Quelle legt sie in Klasse 3 fest, Sachsen nennt sie erst in Klasse 4. Deshalb ist es ein Extra.' },
  { topic: 'Parallel und senkrecht', text: 'Sachsen, Baden-Württemberg und NRW nennen es, Bayern nicht. Deshalb ist es ein Extra.' },
  { topic: 'Genau oder ungefähr', text: 'Bayern, NRW und Baden-Württemberg nennen Überschlag in Sachsituationen und Fermi-Aufgaben, Klasse 3 ist dafür aber nur schwach belegt. Deshalb ist es ein Extra.' },
  { topic: 'Runden', text: 'Sachsen verlangt es in Klasse 3, NRW bis Klasse 4, Bayern nennt nur den Überschlag. Es hilft beim Überschlagen überall und gehört deshalb zum festen Teil.' },
  { topic: 'Teilen mit Rest', text: 'Die Schreibweise ist umstritten: Sachsen schreibt 14 : 3 = 4 Rest 2, das Land Berlin-Brandenburg rät in dieser Phase davon ab. Deshalb gibt es zwei Felder und eine Probe wie 3 · 5 + 2 = 17.' },
  { topic: 'Fläche und Umfang', text: 'Sachsen spricht von einem Einblick, NRW und Baden-Württemberg vom Auslegen. Deshalb wird hier in Kästchen gezählt, ohne Formel und ohne cm².' },
  { topic: 'Wahrscheinlich', text: '„Sicher, möglich, unmöglich“ gilt überall. „Wahrscheinlich“ allein kommt nur auf Stufe 3 vor, Zahlen als Wahrscheinlichkeit gibt es nicht.' },
];
