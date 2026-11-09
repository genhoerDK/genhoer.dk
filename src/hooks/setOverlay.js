// Opening and closing the overlays (?lyt, ?lyt=vaerker, ?kort) changes only the address's query, in
// the browser: no trip to the server. (router.replace would fetch the page's data again, and if a new
// version of the site went out since the page was opened, Next.js then reloads the whole page — and a
// reloaded page may not play sound until it is pressed again.) Next.js keeps useSearchParams in step
// with history.replaceState, so everything that reads the query follows.
//
//   setOverlay('?lyt')   setOverlay('?')   (closes them)

export function setOverlay(query) {
    const url = `${window.location.pathname}${query === '?' ? '' : query}${window.location.hash}`;
    window.history.replaceState(null, '', url);   // not Next.js's own state: then it would take it for its own and not follow
}
