// Afspillere: how each sound work is played on genhoer.dk.
//
// projects.js lays this over the project data (projects.json, written by genhoer-data's Data
// workflow), so a work's player survives the data being written anew. Until genhoer-data carries
// it (an `afspiller` block under hjemmeside in the project file), the settings live here.
//
// A work with an audio file and no entry here gets the timeline. A work with neither has no player.
//
//   interface          One of src/components/Player/interfaces/registry.js:
//                      timeline (default) · circular · buttons · loop · countdown · walk · quad
//   image              A photo behind the player instead of the cover (landscape)
//   ...                The interface's own settings — described in each interface's file
//
// Placeholder sound: a file written as 'placeholder:<name>?s=<seconds>&seed=<n>' is synthesised in
// the browser (src/audio/placeholder.js) until the real file is on the CDN. Swap the string for
// the file's URL — nothing else changes. Placeholder photos are the works' gallery images.

const cdn = (folder, file) => `https://cdn.genhoer.dk/media/${folder}/${file}`;
const placeholder = (name, seconds, seed, extra = '') => `placeholder:${name}?s=${seconds}&seed=${seed}${extra}`;

export const players = {
    /* Grindsted: the timeline, with a landscape photo (with depth) for each chapter */
    'grindsted-station': { interface: 'timeline', landscapeSegments: true },

    /* Troldetoner: five buttons that play tones on the troll's lur (src/data/instruments.js) */
    'troldetoner': { interface: 'buttons', instrument: 'troldetoner' },

    /* Under overfladen: a loop that runs under the surface. The button brings it up for a while
       (the Bela patch: up in 0.1 s, 10 s at the surface, back down over 5 s; presses while up are ignored) */
    'under-overfladen': {
        interface: 'loop',
        layers: {
            below: placeholder('under-overfladen-under', 48, 7, '&kind=loop&lp=420'),   // the processed version (wet)
            above: placeholder('under-overfladen-over', 48, 7, '&kind=loop'),           // the clear version (dry)
        },
        surface: { up: 0.1, hold: 10, down: 5 },
    },

    /* 53 sekunder til fælles: the elevator's button and display. Each press is a ride: the next of
       twelve variations plays, the display shows 53 and after 6 s counts down — one count per
       second, apart from variation 5 (slower) and 8 (faster); variation 7 breaks down at 25 */
    '53-sekunder-til-faelles': {
        interface: 'countdown',
        from: 53,
        delay: 6,
        tracks: Array.from({ length: 12 }, (_, i) => ({
            title: `Variation ${i + 1}`,
            file: placeholder(`53-sekunder-${i + 1}`, 64, 53 + i, i % 3 === 1 ? '&kind=pulse' : ''),
            tempo: { 5: 1.2, 8: 0.68 }[i + 1] ?? 1,   // seconds per count
            stopAt: i + 1 === 7 ? 25 : 0,
        })),
    },

    /* Tværveje: three places in Nakskov, and at each the three characters' stories (nine mono files).
       map = the streets (src/data/maps/), at = where the place sits on it, label = where its name
       stands (left, right, above, below the dot). The walk goes through the places in this order */
    'tvaerveje': {
        interface: 'walk',
        map: 'nakskov',
        characters: [
            { id: 'kirstine', name: 'Kirstine', year: 1620 },
            { id: 'knud', name: 'Knud', year: 1808 },
            { id: 'aksel', name: 'Aksel', year: 1931 },
        ],
        places: [
            { name: 'Det Gamle Færgeleje', image: cdn('nakskov-2026', 'image-03.webp'), at: [230, 300], label: 'right' },
            { name: 'Axeltorv', image: cdn('nakskov-2026', 'image-01.webp'), at: [845, 556], label: 'below' },
            { name: 'Dronningens Pakhus', image: cdn('nakskov-2026', 'image-02.webp'), at: [1115, 890], label: 'above' },
        ].map((place, p) => ({
            ...place,
            stories: ['kirstine', 'knud', 'aksel'].map((character, c) => ({
                character,
                file: placeholder(`tvaerveje-${p + 1}-${character}`, 24, 200 + p * 3 + c),
            })),
        })),
    },

    /* Kanon i G3: four speakers hanging evenly around the gun emplacement, with the listener in the
       middle. angle = where a speaker hangs, degrees clockwise from straight ahead. A stereo file's
       channel is picked with channel: 0 | 1. model = the emplacement in 3D (a sketch for now) */
    'kanon-i-g3': {
        interface: 'quad',
        image: cdn('bornholm-2026', 'image-03.webp'),
        model: '/models/kanonstilling.stl',
        speakers: [
            { label: 'Forrest til venstre', angle: -45, file: placeholder('kanon-1', 40, 31, '&kind=pulse') },
            { label: 'Forrest til højre', angle: 45, file: placeholder('kanon-2', 40, 32, '&kind=pulse') },
            { label: 'Bagest til højre', angle: 135, file: placeholder('kanon-3', 40, 33) },
            { label: 'Bagest til venstre', angle: -135, file: placeholder('kanon-4', 40, 34) },
        ],
        reverb: 0.2,   // 0–1: a little of the bunker's echo on top (synthesised)
    },
};

/** Every sound file a multi-file player can put in the audio element, in order (the first is what plain play() starts) */
function filesOf(player) {
    if (player.tracks) return player.tracks.map((t) => t.file);
    if (player.places) return player.places.flatMap((p) => p.stories.map((s) => s.file));
    return [];
}

/** The project with its player laid over it: project.player = { interface, files, ... } or null */
export function withPlayer(project) {
    const settings = players[project.slug];
    if (!settings && !project.audio) return { ...project, player: null };

    const player = { interface: 'timeline', ...settings };
    player.files = project.audio ? [project.audio] : filesOf(player);

    // Each chapter also has a landscape photo, named like its square one with
    // "segment-" → "segment-landscape-" (segment-01.webp → segment-landscape-01.webp)
    const segments = player.landscapeSegments && project.segments
        ? project.segments.map((s) => ({ ...s, imageLandscape: s.image?.replace(/\/segment-(?=[^/]+$)/, '/segment-landscape-') }))
        : project.segments;

    return { ...project, player, segments };
}
