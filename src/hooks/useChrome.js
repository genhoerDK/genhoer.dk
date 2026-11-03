'use client';

// What the header (and the toolbar on wide screens) should look like, from what is under it.
//
// A part of the page asks for a see-through header by marking itself:
//   data-header="light"   light logo and buttons (on something dark, e.g. a project's cover)
//   data-header="dark"    dark logo and buttons (on something light, e.g. an open player or map)
// Whatever covers the header's middle wins; when several do, the last in the page wins (the
// overlays come after the page). Nothing marked under the header: the usual solid header.
//
// Returns 'light', 'dark' or null (solid).

import { useEffect, useState } from 'react';

const PROBE_Y = 20;   // px from the top: the middle of the 40 px header

function underHeader() {
    let tone = null;
    for (const el of document.querySelectorAll('[data-header]')) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= PROBE_Y && rect.bottom > PROBE_Y && rect.width > 0) tone = el.dataset.header;
    }
    return tone;
}

export function useChrome() {
    const [tone, setTone] = useState(null);

    useEffect(() => {
        let frame;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setTone(underHeader()));
        };
        update();

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

    return tone;
}
