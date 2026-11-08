// The streets for the street interface (src/player/interfaces/street/StreetScene.js), by the name a
// work's player gives (street: 'kirkestraede'): a map of the town round the street, as Tværveje's
// (src/player/vaerker/maps.js), with the street you walk. Each lives in its work's folder, made from
// OpenStreetMap by scripts/osm-map.py.

import { koege } from '@/player/vaerker/kirkestraede/koege';

export const streets = { kirkestraede: koege };
