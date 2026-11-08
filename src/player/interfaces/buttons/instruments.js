// Sound works played with buttons instead of the circular player.
// A project uses one by setting `player` to its key (e.g. player: "troldetoner") in players.js.
// Projects without `player` get the circular player.
//
// baseUrl              Folder on the CDN the files below are read from
// samples              One per button, in order. release = seconds into the file where the tail
//                      starts (letting go before that jumps there; holding plays through)
// music                Stereo loop: left channel = tonal music, right channel = rhythm
// stories              Narrator files, played in this order and then from the start again
// coverDepth           Depth map of the cover (light = near) for parallax behind the buttons. Made with
//                      scripts/depth-map.py. null = the photo moves as one flat layer
// coverFocus           0–1 across the cover image: what stays in view behind the 3D stand on narrow screens
// polyphonic           true = several buttons can sound at once. false = one at a time, like the Bela patch
// levels               Mix levels (the Bela patch had samples 0.6, story 1.2, music 1, rhythm 1)
// timing               Seconds. See src/player/audio/Instrument.js for what each layer does
//
// The numbers for Troldetoner are taken from the Bela patch (main.pd): the samples are
// 4 s (176400 samples at 44.1 kHz) and the release points are the patch's Y values / 44100.

export const instruments = {
    troldetoner: {
        baseUrl: 'https://cdn.genhoer.dk/media/odsherred-2026/lyd/',
        samples: [
            { name: 'C', file: 'C.mp3', release: 3.0 },    // 132300
            { name: 'G', file: 'G.mp3', release: 3.5 },    // 154350
            { name: 'C2', file: 'C2.mp3', release: 2.25 }, // 99225
            { name: 'E', file: 'E.mp3', release: 3.25 },   // 143325
            { name: 'G2', file: 'G2.mp3', release: 2.75 }, // 121275
        ],
        music: 'music.mp3',
        stories: ['story_1.mp3', 'story_2.mp3', 'story_3.mp3', 'story_4.mp3', 'story_5.mp3'],
        coverDepth: '/depth/odsherred-2026.webp',
        coverFocus: 0.68,           // the stone on top of Esterhøj
        polyphonic: true,
        levels: { samples: 0.6, story: 1.2, music: 1.2, rhythm: 1.6 },
        timing: {
            musicFade: 10,          // music fades in/out over (only with musicHold)
            musicHold: null,        // null = music plays from the first play and loops.
                                    // A number (the Bela patch: 100) = presses fade it in, and it
                                    // fades out this many seconds after the last press
            rhythmAfter: 30,        // rhythm opens once the music has been on this long (0 = at once)
            rhythmFadeIn: 0.5,
            rhythmFadeOut: 5,
            storyDelay: 30,         // countdown before a story (and between stories)
            storyMinMusicLeft: 30,  // no new story when less music than this is left
        },
    },
};
