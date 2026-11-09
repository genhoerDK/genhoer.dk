// Afspillere: how each sound work is played on genhoer.dk.
//
// projects.js lays this over the project data (projects.json, written by genhoer-data's Data
// workflow), so a work's player survives the data being written anew. Until genhoer-data carries
// it (an `afspiller` block under hjemmeside in the project file), the settings live in each work's
// own folder, src/player/vaerker/<slug>/player.js, and are gathered here.
//
// A work with an audio file and no entry here gets the timeline. A work with neither has no player.
//
//   interface          One of src/player/interfaces/registry.js:
//                      timeline (default) · buttons · loop · countdown · walk · quad · street
//   image              A photo behind the player instead of the cover (landscape)
//   ...                The interface's own settings — described in each interface's file
//
// Files on the CDN and placeholder sound: cdn() and placeholder() in src/player/vaerker/files.js.
// Placeholder photos are the works' gallery images.

import { player as grindsted_station } from '@/player/vaerker/grindsted-station/player';
import { player as troldetoner } from '@/player/vaerker/troldetoner/player';
import { player as w53_sekunder_til_faelles } from '@/player/vaerker/53-sekunder-til-faelles/player';
import { player as tvaerveje } from '@/player/vaerker/tvaerveje/player';
import { player as kanon_i_g3 } from '@/player/vaerker/kanon-i-g3/player';
import { player as kirkestraede } from '@/player/vaerker/kirkestraede/player';

export const players = {
    'grindsted-station': grindsted_station,
    'troldetoner': troldetoner,
    '53-sekunder-til-faelles': w53_sekunder_til_faelles,
    'tvaerveje': tvaerveje,
    'kanon-i-g3': kanon_i_g3,
    'kirkestraede': kirkestraede,
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
