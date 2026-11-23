// Afspillere: how each sound work is played on genhoer.dk.
//
// projects.js lays this over the project data (projects.json, written by genhoer-data's Data
// workflow), so a work's player survives the data being written anew. Until genhoer-data carries
// it (an `afspiller` block under hjemmeside in the project file), the settings live in each work's
// own folder, src/player/vaerker/<slug>/player.js, and are gathered here.
//
// A work with an audio file (audio from genhoer-data, set in the dashboard's media window Lyd) and no entry in
// players gets the timeline, with its segments (chapters) from genhoer-data too. A work with neither has no player.
// A work with its own interface plays the files in its player.js: a sound file and segments from genhoer-data
// don't apply to it (the dashboard doesn't offer them; it reads which works these are from /afspillere.json,
// src/app/afspillere.json/route.js).
//
//   interface          One of src/player/interfaces/registry.js:
//                      timeline (default) · buttons · loop · countdown · walk · quad · street
//   image              A photo behind the player instead of the cover (landscape)
//   ...                The interface's own settings — described in each interface's file
//
// Files on the CDN and placeholder sound: cdn() and placeholder() in src/player/vaerker/files.js.
// Placeholder photos are the works' gallery images.

import { DEFAULT_INTERFACE } from '@/player/interfaces/registry';
import { player as troldetoner } from '@/player/vaerker/troldetoner/player';
import { player as w53_sekunder_til_faelles } from '@/player/vaerker/53-sekunder-til-faelles/player';
import { player as tvaerveje } from '@/player/vaerker/tvaerveje/player';
import { player as kanon_i_g3 } from '@/player/vaerker/kanon-i-g3/player';

export const players = {
    'troldetoner': troldetoner,
    '53-sekunder-til-faelles': w53_sekunder_til_faelles,
    'tvaerveje': tvaerveje,
    'kanon-i-g3': kanon_i_g3,
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
    // Its own interface: its own files, and no sound file or segments from genhoer-data
    const p = settings && (settings.interface ?? DEFAULT_INTERFACE) !== DEFAULT_INTERFACE ? { ...project, audio: null, segments: null } : project;
    if (!settings && !p.audio) return { ...p, player: null };

    const player = { interface: DEFAULT_INTERFACE, ...settings };
    player.files = p.audio ? [p.audio] : filesOf(player);

    return { ...p, player };
}
