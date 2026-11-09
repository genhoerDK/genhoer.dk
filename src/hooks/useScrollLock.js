'use client';

// Stops the page underneath from scrolling while an overlay (?kort, ?lyt) is open — also when
// the page is loaded with one open.
//
// - Counted: the map and the player each hold a lock, and the page stays locked while any is
//   held. (Setting and clearing a style per overlay broke when going straight from one overlay
//   to the other: the one closing could clear the lock after the one opening had set it.)
// - The page stays where it is: only overflow: hidden and overscroll-behavior: none on the root,
//   which iOS Safari respects from iOS 16. (It used to pin the body with position: fixed at its
//   scroll position. On an iPhone scrolled to the bottom that woke Safari's collapsed address bar,
//   the visible area moved, and taps landed beside the buttons — nothing could be pressed.)
// - When the last lock is let go on another page (a work chosen in the player's overview, a
//   project on the map), you start at the top.

import { useEffect } from 'react';

let locks = 0;
let lockPage = '';   // pathname of the page the lock was taken on

function apply() {
    const html = document.documentElement;
    const isLocked = html.dataset.scrollLocked === 'true';

    if (locks > 0 && !isLocked) {
        lockPage = window.location.pathname;
        html.dataset.scrollLocked = 'true';
        Object.assign(html.style, { overflow: 'hidden', overscrollBehavior: 'none' });
        document.body.style.overflow = 'hidden';
    } else if (locks === 0 && isLocked) {
        delete html.dataset.scrollLocked;
        Object.assign(html.style, { overflow: '', overscrollBehavior: '' });
        document.body.style.overflow = '';
        if (window.location.pathname !== lockPage) window.scrollTo(0, 0);
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
