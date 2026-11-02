// Sound works played with buttons instead of the circular player.
// A project uses one by setting `player` to its key (e.g. player: "troldetoner") in genhoer-data.
// Projects without `player` get the circular player.
//
// baseUrl              Folder on the CDN the files below are read from
// samples              One per button, in order. release = seconds into the file where the tail
//                      starts (letting go before that jumps there; holding plays through)
// music                Stereo loop: left channel = tonal music, right channel = rhythm
// stories              Narrator files, played in this order and then from the start again
// polyphonic           true = several buttons can sound at once. false = one at a time, like the Bela patch
// levels               Mix levels (music and rhythm are 1)
// timing               Seconds. See src/audio/Instrument.js for what each layer does
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
        polyphonic: true,
        levels: { samples: 0.6, story: 1.2 },
        timing: {
            musicFade: 10,          // music fades in/out over
            musicHold: 100,         // music fades out this long after the last press
            rhythmAfter: 30,        // rhythm opens once the music has been on this long
            rhythmFadeIn: 0.5,
            rhythmFadeOut: 5,
            storyDelay: 30,         // countdown before a story (and between stories)
            storyMinMusicLeft: 30,  // no new story when less music than this is left
        },
    },
};
