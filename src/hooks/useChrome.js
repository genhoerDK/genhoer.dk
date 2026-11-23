'use client';

// What the header (and the toolbar on wide screens) should look like, from what is under it.
//
// A part of the page asks for a see-through header by marking itself:
//   data-header="light"   light logo and buttons (on something dark, e.g. a project's cover)
//   data-header="dark"    dark logo and buttons (on something light, e.g. an open player or map)
// Whatever covers the header's middle wins; when several do, the last in the page wins (the
// overlays come after the page). Nothing marked under the header: the usual solid header.
//
// Returns { tone, snap }: tone is 'light', 'dark' or null (solid). snap is true just after a new page
// has come in: the header then changes in the same frame as the page, without fading, so it doesn't
// look like it is still loading. Scrolling and the overlays fade as usual.

import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const PROBE_Y = 20;    // px from the top: the middle of the 40 px header
const SNAP_MS = 150;   // how long after a page change the header follows without fading (Next.js scrolls
                       // the new page to the top just after it has come in)

function underHeader() {
    let tone = null;
    for (const el of document.querySelectorAll('[data-header]')) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= PROBE_Y && rect.bottom > PROBE_Y && rect.width > 0) tone = el.dataset.header;
    }
    return tone;
}

export function useChrome() {
    const pathname = usePathname();
    const [tone, setTone] = useState(null);
    const [snap, setSnap] = useState(true);

    // A new page (and the first one): read it before it is drawn
    useLayoutEffect(() => {
        setSnap(true);
        setTone(underHeader());
        const timer = setTimeout(() => setSnap(false), SNAP_MS);
        return () => clearTimeout(timer);
    }, [pathname]);

    useEffect(() => {
        let frame;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setTone(underHeader()));
        };

        // Scrolling, resizing, overlays sliding in and out, and pages / overlays changing
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        document.addEventListener('transitionend', update);
        const observer = new MutationObserver(update);
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-header'] });

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            document.removeEventListener('transitionend', update);
            observer.disconnect();
        };
    }, []);

    return { tone, snap };
}
