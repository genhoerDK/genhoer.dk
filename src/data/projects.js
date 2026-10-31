// All projects on the site. They are maintained in the dashboard (genhoer-data) and written to
// projects.json by the build (.github/workflows/nextjs.yml runs genhoer-data/scripts/offentlig.js).
// The committed projects.json is a snapshot so `npm run dev` works without access to genhoer-data.
//
// slug                 URL of the project page (genhoer.dk/<slug>)
// previousSlugs        Old URLs that redirect to slug (e.g. the town name before the work had a title)
// title, location      Shown on cards, project page and map
// coordinates          [longitude, latitude] of the marker on the map
// labelOffsetSmall/-Large  Where the map label sits relative to the marker (mobile / desktop)
// kommune, komkode     Kommune name and code — komkode lights up the kommune on the map
// startDate, endDate   'YYYY-MM-DD'. endDate null = permanent installation
// partners             Text shown under "Partnere"
// sponsorLogos         Names of files in public/logos/<name>-logo.svg
// description          Paragraphs on the project page. The last one is also the search engine description
// coverImage*/coverVideo  Images/video for page background (portrait/landscape), cards and hover video
// artwork              Lock screen image while playing (null = public/fallback-artwork.jpg)
// media                Full URLs shown in the gallery. The 4th file becomes the big tile and the 11th the wide tile
// audio, segments      Sound work and its chapters (start in seconds). null = project without sound
// player               Optional. How the work is shown in the full-page player, e.g. { "type": "landskab" }.
//                      Missing = "kapitler". See src/components/Player/Immersive/interfaces/index.js.
//                      Interactive works also list `tracks` and `buttons` (see src/audio/LayeredEngine.js
//                      and players.json) and need no `audio`
// composer             Not shown on the site at the moment
import data from './projects.json';
import players from './players.json';

// Interactive works (layers + push buttons) are described in players.json until the
// dashboard can hold the `player` field. A `player` from genhoer-data wins.
export const projects = data.map((p) => ({ ...p, player: p.player ?? players[p.slug] ?? null }));
