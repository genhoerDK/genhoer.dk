// The streets of central Nakskov round the harbour, for Tværveje's map (the walk interface,
// src/components/Player/WalkScene.js). A simplified drawing made once from a small extract of
// OpenStreetMap: 78 objects (the streets, the coastline, Indrefjord and Axeltorv), under the
// 100 the OSM Foundation counts as insubstantial — so keep it to this one drawing, and don't add
// more extracts to it. Lines are thinned to within a few metres and rounded to whole metres.
//
// Units are metres on a 960 × 630 sheet (x to the east, y to the south); the places' `at`
// in src/data/players.js use the same.
//
//   metres   How many metres one unit is (1)
//   water    The harbour and Indrefjord, as closed SVG paths
//   quay     The water's edge
//   main     The through streets
//   side     The other streets
//   zone     The walking streets, drawn as a soft band under the streets
//   squares  Axeltorv, as a closed path

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
    squares: ["M647,340 L638,352 L580,337 L577,339 L555,327 L553,329 L546,323 L547,316 L564,305 L607,291 L610,287 L618,286 L631,317 L647,340 Z"],
};
