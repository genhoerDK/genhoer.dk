// Upcoming projects that are not published yet (no project page): name, kommune, dates and, if set, coordinates
// and cover images. Shown on the front page map from 1 January of the exhibition's year until it opens
// (utilities/projectsByStatus.js). Only projects with an exhibition and a kommune in genhoer-data. Written by
// genhoer-data's Data workflow (scripts/offentlig.js) whenever they change; do not edit upcoming.json by hand.
// Once a project is published it is in projects.json instead.
import data from './upcoming.json';

export const upcomingProjects = data;
