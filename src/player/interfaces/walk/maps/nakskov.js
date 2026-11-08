// The streets of central Nakskov round the harbour, with its landmarks, for Tværveje's map (the
// walk interface, src/player/interfaces/walk/WalkScene.js). A simplified drawing made once from a single
// small extract of OpenStreetMap: 99 objects (the streets, a few footpaths, the coastline,
// Indrefjord, Axeltorv, the old ferry berth's piers and six landmark buildings), under the 100 the
// OSM Foundation counts as insubstantial — so keep it to this one drawing, and don't add more
// extracts to it. Lines are thinned to within a few metres and rounded to whole metres. The other
// houses on the map are made up (src/player/interfaces/walk/town.js).
//
// Units are metres on a 960 × 630 sheet (x to the east, y to the south); the places' `at`
// in src/player/players.js use the same.
//
//   metres     How many metres one unit is (1)
//   water      The harbour and Indrefjord, as closed SVG paths
//   quay       The water's edge
//   main       The through streets
//   side       The other streets
//   zone       The walking streets, drawn as a soft band under the streets
//   path       Footpaths
//   squares    Axeltorv, as a closed path
//   landmarks  Buildings that stand out, by name: { kind, height, ring }. height: metres to the eaves
//              (to the top for a tower). kind: church (nave, and a tower with a spire at its west
//              end), tower (round, with a cone), warehouse, hall or chapel (pitched roofs). One named
//              like a place lights up when you are there

export const nakskov = {
    width: 960,
    height: 630,
    metres: 1,
    water: ["M12,0 L83,118 L198,158 L199,155 L233,166 L235,172 L233,175 L237,182 L258,199 L382,366 L387,362 L421,395 L426,395 L506,435 L505,438 L726,534 L733,542 L847,544 L851,547 L845,562 L842,562 L831,574 L818,574 L818,578 L668,586 L662,598 L393,465 L398,456 L277,397 L259,384 L215,342 L217,340 L203,323 L149,271 L134,267 L113,244 L102,218 L0,230 L0,0 Z", "M879,554 L897,568 L910,561 L955,556 L960,556 L960,630 L960,576 L954,576 L898,590 L879,587 L866,569 L862,571 L871,551 L879,554 Z"],
    quay: ["M12,0 L83,118 L198,158 L199,155 L233,166 L235,172 L233,175 L237,182 L258,199 L382,366 L387,362 L421,395 L426,395 L506,435 L505,438 L726,534 L733,542 L847,544 L851,547 L845,562 L842,562 L831,574 L818,574 L818,578 L668,586 L662,598 L393,465 L398,456 L277,397 L259,384 L215,342 L217,340 L203,323 L149,271 L134,267 L113,244 L102,218 L0,230"],
    main: [
        "M470,630 L476,625",
        "M835,104 L850,134 L861,178",
        "M812,28 L886,43 L960,53",
        "M588,45 L660,23 L732,10 L812,28",
        "M308,161 L351,249",
        "M526,429 L748,519 L867,532",
        "M852,570 L861,548",
        "M861,548 L867,532",
        "M402,121 L280,173",
        "M364,1 L389,49 L402,121",
        "M840,630 L840,620 L844,592",
        "M483,608 L529,630",
        "M363,0 L364,1",
        "M351,249 L398,342 L429,376",
        "M812,28 L811,54 L835,104",
        "M867,532 L944,543",
        "M531,67 L588,45",
        "M402,121 L531,67",
        "M429,376 L484,409 L526,429",
        "M280,173 L264,181",
        "M476,625 L483,608",
        "M844,592 L852,570",
        "M944,543 L960,544",
    ],
    side: [
        "M483,608 L344,532 L303,524 L0,571",
        "M246,0 L308,161",
        "M526,429 L547,392",
        "M861,178 L879,212 L897,269",
        "M752,520 L770,448",
        "M906,434 L881,501",
        "M413,148 L429,179 L491,259",
        "M398,342 L506,279",
        "M724,378 L758,287 L781,267 L822,246",
        "M588,45 L574,0",
        "M526,41 L512,0",
        "M429,376 L464,339 L525,301",
        "M835,104 L768,134",
        "M351,249 L414,221",
        "M634,424 L620,468",
        "M443,198 L449,191 L446,139",
        "M874,408 L806,206",
        "M806,206 L768,134",
        "M768,134 L700,169 L592,213",
        "M491,259 L529,241",
        "M612,284 L806,206 L861,178",
        "M612,284 L592,213",
        "M592,213 L531,67",
        "M960,164 L866,127 L848,128",
        "M286,525 L245,388",
        "M264,181 L275,203 L382,345",
        "M167,0 L167,3 L197,45 L264,181",
        "M230,110 L256,136 L287,148 L284,155 L269,161",
        "M548,439 L573,392",
        "M629,597 L380,474 L346,533",
        "M525,628 L524,630",
        "M555,324 L564,316 L617,295",
        "M264,181 L236,157 L204,144",
        "M644,393 L634,424",
        "M612,284 L617,295",
        "M529,241 L593,216",
        "M491,259 L525,301 L543,318 L555,324",
        "M402,121 L413,148",
        "M516,625 L550,557",
        "M881,501 L867,532",
        "M906,434 L952,453 L960,455",
        "M925,280 L935,273 L960,231",
        "M907,305 L919,346 L922,375",
        "M897,269 L907,305",
        "M900,279 L925,280",
    ],
    zone: [
        "M874,408 L833,415 L812,413 L632,340",
        "M582,331 L547,392",
        "M657,350 L644,393",
        "M770,448 L779,402",
        "M916,404 L895,403 L874,408",
        "M922,375 L906,434",
    ],
    path: [
        "M844,590 L822,583 L668,589 L662,602 L629,597",
        "M960,587 L946,606 L944,614 L935,630",
        "M247,3 L238,7 L225,1 L204,4 L195,2 L186,6 L188,13 L202,27 L207,47 L217,60 L239,41 L235,6",
        "M386,43 L426,29 L444,49 L453,46 L459,39 L497,27 L514,74",
        "M852,570 L868,597 L891,605 L939,593 L960,585",
        "M627,33 L636,55 L631,57 L635,70 L634,76 L614,82 L604,53 L631,43",
        "M636,55 L644,52 L659,88 L692,73 L677,30",
        "M573,169 L666,124 L657,108",
        "M174,376 L184,367 L230,414 L257,439 L261,439",
        "M423,384 L419,388 L469,417 L507,434 L506,438 L517,441",
        "M810,115 L768,60 L746,49 L743,43 L746,29",
        "M653,110 L743,63 L750,53",
        "M559,284 L570,314 L580,322 L629,336 L632,340",
    ],
    squares: ["M647,340 L638,352 L580,337 L577,339 L555,327 L553,329 L546,323 L547,316 L564,305 L607,291 L610,287 L618,286 L631,317 L647,340 Z"],
    landmarks: {
        "Sankt Nikolaj Kirke": {"kind": "church", "height": 16, "ring": "M546,272 L590,267 L596,258 L595,248 L589,241 L543,247 L543,253 L541,253 L542,255 L543,255 L544,264 L543,264 L543,266 L545,265 Z"},
        "Vandt\u00e5rnet": {"kind": "tower", "height": 38, "ring": "M641,286 L644,285 L644,281 L643,280 L640,279 L638,281 L638,284 L639,285 Z"},
        "Dronningens Pakhus": {"kind": "warehouse", "height": 10, "ring": "M753,467 L762,469 L752,512 L743,510 Z"},
        "Havnebygningen": {"kind": "hall", "height": 10, "ring": "M301,220 L302,216 L306,212 L310,213 L341,252 L340,252 L362,282 L361,286 L357,289 L353,289 Z"},
        "Skibs- og S\u00f8fartsmuseet": {"kind": "hall", "height": 9, "ring": "M586,116 L590,127 L580,131 L581,133 L570,136 L565,125 L562,126 L559,117 L561,116 L556,104 L564,101 L569,113 L581,107 L585,116 Z"},
        "Sankt Franciscus Kirke": {"kind": "chapel", "height": 9, "ring": "M746,117 L745,118 L742,113 L751,109 L754,107 L757,112 L755,113 L764,130 L755,134 Z"},
    },
};
