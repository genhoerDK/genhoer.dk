// The streets around the harbour in Nakskov, for Tværveje's map (the walk interface).
// Traced from a map of the area; the coordinates are pixels in that map (1480 × 1084), and the
// places' `at` in src/data/players.js use the same. Curves where the streets curve.
//
//   water    The harbour, as an SVG path (closed)
//   quay     The quay's edge, where the promenade runs
//   main     The wider streets (drawn with a dark casing)
//   side     The lanes
//   zone     The walking street and the square, drawn as a soft band under everything
//   labels   Street names: where they stand and their angle in degrees

export const nakskov = {
    width: 1480,
    height: 1084,
    water: 'M15,232 L60,232 L230,300 C265,345 300,395 325,425 L440,600 C470,640 500,662 530,680 L625,732 L800,797 L880,832 L980,882 L1070,917 L1180,940 L1300,942 L1480,962 L1480,1084 L0,1084 L0,250 Z',
    quay: 'M15,232 L60,232 L230,300 C265,345 300,395 325,425 L440,600 C470,640 500,662 530,680 L625,732 L800,797 L880,832 L980,882 L1070,917 L1180,940 L1300,942',
    main: [
        'M235,300 Q620,140 1000,35 L1150,2',                                          // Nørrevold
        'M1180,55 C1230,160 1290,260 1300,310 C1330,400 1400,520 1400,600 C1400,700 1330,830 1270,962',   // Jernbanegade, Nygade
        'M235,300 C290,380 380,500 440,600 C480,655 520,690 575,700 L800,770 C900,815 1050,870 1180,897 L1310,922 L1480,955',   // Toldbodkaj, Havnegade
        'M1300,178 L1130,225 L980,300 L830,370 L735,415',                             // Bredgade
        'M718,120 C760,260 820,420 845,555',                                          // Søndergade, down to Axeltorv
        'M700,522 L845,555 C950,612 1110,692 1230,702 L1385,682',                     // the walking street
    ],
    side: [
        'M0,218 L230,300',                                                            // Østre Kaj
        'M208,240 L282,145 L335,55 L348,0',
        'M285,262 L410,430 C450,500 500,590 560,660',                                 // Erlingsvej
        'M1120,25 C1200,50 1300,70 1480,92',                                          // Perlestikkergade
        'M1068,50 L1105,125 L1180,162',
        'M935,180 L1115,50',
        'M1300,305 L1180,350 L1000,437',                                              // Tilegade
        'M1172,212 L1190,310 L1215,450',
        'M1000,437 L962,585',
        'M500,198 C560,330 640,470 700,522',                                          // down to Café Bita
        'M890,640 L875,795',
        'M1145,692 L1118,888',                                                        // down to Dronningens Pakhus
        'M680,728 L795,538',
        'M1395,640 L1480,628',
    ],
    zone: [
        'M700,522 L845,555 C950,612 1110,692 1230,702 L1385,682',
        'M845,555 L870,470',
    ],
    labels: [
        { text: 'Nørrevold', x: 560, y: 168, angle: -22 },
        { text: 'Toldbodkaj', x: 330, y: 478, angle: 55 },
        { text: 'Havnegade', x: 980, y: 795, angle: 22 },
        { text: 'Nygade', x: 1428, y: 640, angle: 80 },
        { text: 'Bredgade', x: 1060, y: 250, angle: -24 },
        { text: 'Jernbanegade', x: 1255, y: 185, angle: 62 },
        { text: 'Erlingsvej', x: 370, y: 335, angle: 55 },
    ],
};

export const maps = { nakskov };
