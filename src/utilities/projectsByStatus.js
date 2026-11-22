//////////////////////////////////////////////
//// Split projects into upcoming/opened  ////
//////////////////////////////////////////////

import { projects } from '@/data/projects';
import { upcomingProjects } from '@/data/upcoming';

const byStart = (a, b) => new Date(a.startDate) - new Date(b.startDate);

// One rule for the front page carousel and the map:
// upcoming: from src/data/upcoming.js (every project with an exhibition and a kommune, published or not), from
//           1 January of the year it opens until the opening day, soonest first
// opened:   published projects (src/data/projects.js) from the opening day, in data order
// Publishing only gives a project its page: it is not shown as opened before the exhibition opens.
export function getProjectsByStatus(today = new Date()) {
    const notOpened = (project) => new Date(project.startDate) > today;
    const thisYear = (project) => Number(project.startDate.slice(0, 4)) <= today.getFullYear();

    const upcoming = upcomingProjects.filter((p) => notOpened(p) && thisYear(p)).sort(byStart);
    const opened = projects.filter((p) => !notOpened(p));

    return { upcoming, opened };
}
