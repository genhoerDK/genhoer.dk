// Which player a work gets, kept here on genhoer.dk for now (a test setup) instead of in genhoer-data.
// projects.js lays this over the project data, so it survives the build writing projects.json anew.
// When it moves to genhoer-data (a `player` field, and an image per chapter for landscape), this file
// can go.
//
// player               An interface (see src/components/Player/interfaces/index.js):
//                      "timeline", or a key in instruments.js (e.g. "troldetoner"). Not here = circular
// landscapeSegments    true = each chapter also has a landscape image, named like its image with
//                      "segment-" → "segment-landscape-" (segment-01.webp → segment-landscape-01.webp).
//                      The timeline shows it instead of the square one

export const players = {
    'troldetoner': { player: 'troldetoner' },
    'grindsted-station': { player: 'timeline', landscapeSegments: true },
};

/** The project with its player laid over it */
export function withPlayer(project) {
    const settings = players[project.slug];
    if (!settings) return project;
    const segments = settings.landscapeSegments && project.segments
        ? project.segments.map((s) => ({ ...s, imageLandscape: s.image?.replace(/\/segment-(?=[^/]+$)/, '/segment-landscape-') }))
        : project.segments;
    return { ...project, player: settings.player, segments };
}
