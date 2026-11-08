// How kirkestraede is played: its interface and that interface's settings (see src/player/players.js).

/* Kirkestræde: the street in Køge in 3D, seen from above, from Torvet to Sankt Nicolai Kirke,
   walked by scrolling. street = the town round it (koege.js here, from OpenStreetMap); ends = the
   names at either end; speakers = how many hang along it, in pairs facing each other. The work (one file,
   its chapters on the timeline) is loudest by the speakers */
export const player = {
    interface: 'street',
    street: 'kirkestraede',
    ends: ['Torvet', 'Sankt Nicolai Kirke'],
    speakers: 8,
};
