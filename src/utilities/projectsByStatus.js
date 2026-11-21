//////////////////////////////////////////////
//// Split projects into upcoming/opened  ////
//////////////////////////////////////////////

const byStart = (a, b) => new Date(a.startDate) - new Date(b.startDate);

// upcoming: not opened yet, soonest first · opened: everything else, in data order
// unpublished (src/data/upcoming.js) join upcoming from 1 January of the year they open
export function getProjectsByStatus(projects, today = new Date(), unpublished = []) {
    const notOpened = (project) => new Date(project.startDate) > today;
    const thisYear = (project) => Number(project.startDate.slice(0, 4)) <= today.getFullYear();

    const upcoming = [...projects.filter(notOpened), ...unpublished.filter((p) => notOpened(p) && thisYear(p))].sort(byStart);
    const opened = projects.filter((project) => new Date(project.startDate) <= today);

    return { upcoming, opened };
}
