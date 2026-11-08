// All projects on the site. They are maintained in the dashboard (genhoer-data), whose Data workflow
// writes projects.json, partners.json and public/logos to this repo whenever the public fields change
// (genhoer-data/scripts/offentlig.js). Do not edit projects.json by hand; it is overwritten.
//
// slug                 URL of the project page (genhoer.dk/<slug>)
// previousSlugs        Old URLs that redirect to slug (e.g. the town name before the work had a title)
// title, location      Shown on cards, project page and map
// coordinates          [longitude, latitude] of the marker on the map
// labelOffsetSmall/-Large  Where the map label sits relative to the marker (mobile / desktop).
//                      Desktop only uses the sign of x: label right (+) or left (-) of the kommune
// kommune, komkode     Kommune name and code — komkode lights up the kommune on the map
// startDate, endDate   'YYYY-MM-DD'. endDate null = permanent installation
// partners             Text shown under "Partnere"
// sponsorLogos         Names of files in public/logos/<name>-logo.svg
// description          Paragraphs on the project page. The last one is also the search engine description
// coverImage*/coverVideo  Images/video for page background (portrait/landscape), cards and hover video
// artwork              Lock screen image while playing (null = public/fallback-artwork.jpg)
// media                Full URLs shown in the gallery. The 4th file becomes the big tile and the 11th the wide tile
// audio, segments      Sound work and its chapters (start in seconds). null = project without sound
// player               How the work is played — not from genhoer-data yet: laid over from players.js
//                      ({ interface, files, ... } or null; a chapter may get an imageLandscape)
// composer             Not shown on the site at the moment
import data from './projects.json';
import { withPlayer } from '@/player/players';

export const projects = data.map(withPlayer);
