'use client';

// Stops the page underneath from scrolling while an overlay (?kort, ?lyt) is open — also when
// the page is loaded with one open.
//
// - Counted: the map and the player each hold a lock, and the page stays locked while any is
//   held. (Setting and clearing a style per overlay broke when going straight from one overlay
//   to the other: the one closing could clear the lock after the one opening had set it.)
// - Pins the body in place with position: fixed at its scroll position, which also works on
//   iOS Safari, where overflow: hidden on the body doesn't stop scrolling. The scroll position
//   is put back when the last lock is let go — on the page it was taken on. On another page (a
//   work chosen in the player's overview of works, a project on the map) you start at the top.

import { useEffect } from 'react';

let locks = 0;
let scrollY = 0;
let scrollPage = '';   // pathname of the page scrollY belongs to

function apply() {
    const body = document.body;
    const html = document.documentElement;
    const isLocked = body.dataset.scrollLocked === 'true';

    if (locks > 0 && !isLocked) {
        scrollY = window.scrollY;
        scrollPage = window.location.pathname;
        body.dataset.scrollLocked = 'true';
        Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', overflow: 'hidden' });
        html.style.overscrollBehavior = 'none';
    } else if (locks === 0 && isLocked) {
        delete body.dataset.scrollLocked;
        Object.assign(body.style, { position: '', top: '', left: '', right: '', overflow: '' });
        html.style.overscrollBehavior = '';
        window.scrollTo(0, window.location.pathname === scrollPage ? scrollY : 0);
    }
}

export function useScrollLock(locked) {
    useEffect(() => {
        if (!locked) return;
        locks++;
        apply();
        return () => {
            locks--;
            apply();
        };
    }, [locked]);
}
