/**
 * Misconception families of the topic 'daten'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * daten.chancen is a choice skill: its misconceptions live in whyWrong, so it has no bug keys.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'daten-zeile-spalte': {
    'daten.tabelle': 'andere-zeile andere-spalte',
    'daten.diagramme': 'andere-zeile',
    'daten.fahrplan': 'andere-zeile',
  },
  'daten-unterschied': {
    'daten.tabelle': 'mehr-unterschied',
    'daten.diagramme': 'mehr-unterschied',
  },
  'daten-rechenart': {
    'daten.tabelle': 'plus-statt-minus minus-statt-plus',
    'daten.diagramme': 'plus-statt-minus',
  },
  'daten-alle-werte': {
    'daten.tabelle': 'nur-ein-wert wert-vergessen spalte-vergessen',
    'daten.diagramme': 'wert-vergessen',
    'daten.fahrplan': 'nur-ein-preis alle-preise menge-vergessen',
  },
  'daten-teil-ganzes': { 'daten.tabelle': 'gesamt-gelesen' },
  'daten-angabe-fehlt': { 'daten.tabelle': 'angabe-fehlt' },
  'daten-achse': {
    'daten.diagramme': 'achse-schritt zwischen-unten zwischen-oben',
    'daten.darstellen': 'achse-schritt',
  },
  'daten-legende': { 'daten.diagramme': 'bild-legende' },
  'daten-strichliste': { 'daten.darstellen': 'buendel-als-vier buendel-als-eins' },
  'daten-abschreiben': { 'daten.darstellen': 'abgeschrieben' },
  'daten-fahrzeit': { 'daten.fahrplan': 'fahrplan-spanne nur-minuten nur-ankunft' },
  'daten-cent': { 'daten.fahrplan': 'cent-uebertrag' },
  'daten-kombinieren': { 'daten.kombinieren': 'kombi-addiert nur-eine-wahl teil-produkt neu-plus-eins' },
  'daten-reihenfolge': { 'daten.kombinieren': 'reihe-nur-drei reihe-mal-drei reihe-alle reihe-schon-da' },
  'daten-chancen-ordnen': { 'daten.sicher-moeglich': 'umgedreht' },
};

export default families;
