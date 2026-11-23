// Upcoming projects for the front page carousel and the map: every project with an exhibition and a kommune in
// genhoer-data, published or not, with name, kommune, dates and, if set, coordinates and cover images. Shown from
// 1 January of the exhibition's year until it opens (utilities/projectsByStatus.js). Publishing only adds the
// project page (projects.json), which takes over in the grid and on the map from the opening day. Written by
// genhoer-data's Data workflow (scripts/offentlig.js) whenever they change; do not edit upcoming.json by hand.
import data from './upcoming.json';

export const upcomingProjects = data;
