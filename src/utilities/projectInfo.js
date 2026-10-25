//////////////////////////////////////////
//// Info rows shown under a project  ////
//////////////////////////////////////////

import { formatDates } from "@/utilities/formatDates";

// Used by InfoList on project cards and project pages
export function getProjectInfo({ startDate, endDate, location, kommune, partners }) {
    return [
        { label: "Udstilling", value: formatDates(startDate, endDate) },
        { label: "Lokalitet", value: `${location}, ${kommune}` },
        { label: "Partnere", value: partners },
    ];
}
