//////////////////////////////////////////////
//// Split projects into upcoming/opened  ////
//////////////////////////////////////////////

// upcoming: not opened yet, soonest first · opened: everything else, in data order
export function getProjectsByStatus(projects, today = new Date()) {
    const upcoming = projects
        .filter((project) => new Date(project.startDate) > today)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const opened = projects.filter((project) => new Date(project.startDate) <= today);

    return { upcoming, opened };
}
