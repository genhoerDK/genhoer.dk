// A sketch of the streets around the harbour in Nakskov, for Tværveje's map (the walk interface).
// Traced from a map of the area; the coordinates are pixels in that map (1457 × 1084), and the
// places' `at` in src/data/players.js use the same.
//
//   water     The harbour, as an SVG path
//   streets   SVG paths; the named ones get a label along them
//   labels    Street names and where they stand (angle in degrees)

export const nakskov = {
    width: 1457,
    height: 1084,
    water: 'M0,215 L60,232 L230,298 L300,385 L470,610 L560,685 L700,765 L900,855 L1060,915 L1275,935 L1457,955 L1457,1084 L0,1084 Z',
    streets: [
        'M240,300 L420,232 L700,122 L1000,32 L1160,0',          // Nørrevold
        'M230,300 L300,385 L470,610 L560,662',                  // Toldbodkaj
        'M560,662 L720,737 L900,822 L1100,890 L1300,905',       // Havnegade
        'M330,300 L380,380 L470,520 L560,662',                  // Erlingsvej
        'M650,112 L700,320 L760,470',                           // Søndergade (from the museum down)
        'M700,122 L760,330 L843,556',                           // down to Axeltorv
        'M843,556 L1000,575 L1200,625 L1340,520',               // the walking street
        'M1085,660 L1113,892',                                  // down to the harbour
        'M1290,110 L1050,262 L870,330',                         // Bredgade
        'M1300,282 L1100,432',                                  // Tilegade
        'M1250,0 L1290,250 L1340,520 L1310,900',                // Jernbanegade, Nygade
        'M560,60 L600,180 L690,330',
        'M870,330 L843,556',
    ],
    labels: [
        { text: 'Nørrevold', x: 470, y: 185, angle: -21 },
        { text: 'Havnegade', x: 930, y: 800, angle: 24 },
        { text: 'Nygade', x: 1385, y: 720, angle: 84 },
        { text: 'Toldbodkaj', x: 350, y: 470, angle: 54 },
    ],
};

export const maps = { nakskov };
