'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Fullscreen overlay that slides up from the bottom when active.
 * Can close either by sliding down again, or by fading out in place
 * (e.g. when navigating away via a map marker). After a fade-out
 * finishes, the overlay snaps back off-screen so the next
 * time it opens, it slides up as usual.
 *
 * @param {boolean} active - Whether the overlay is visible
 * @param {'slide'|'fade'} exit - How the overlay animates when closing
 * @param {'paper'|'ink'} tone - Light or dark background (the header follows: dark chrome on paper, light on ink)
 */

export default function Overlay({ active, exit = 'slide', tone = 'paper', children }) {
    const header = tone === 'ink' ? 'light' : 'dark';
    const ref = useRef(null);
    const [resetting, setResetting] = useState(false);
    const [instant, setInstant] = useState(false);

    useEffect(() => {
        if (active) {
            setResetting(false);
            setInstant(false);
        }
    }, [active]);

    const handleTransitionEnd = (e) => {
        if (e.target !== ref.current || e.propertyName !== 'opacity') return;
        if (active || exit !== 'fade') return;

        // Fade is done and opacity is 0 — snap the position back
        // off-screen instantly, with transitions suppressed, so
        // nothing is visible while it happens.
        setInstant(true);
        setResetting(true);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => setInstant(false));
        });
    };

    const closedClasses = exit === 'fade' && !resetting
        ? 'translate-y-0 opacity-0'
        : 'translate-y-full opacity-100';

    return (
        <article ref={ref} data-header={active ? header : undefined} onTransitionEnd={handleTransitionEnd} style={instant ? { transitionDuration: '0ms' } : undefined} className={`fixed inset-0 transition-all duration-300 z-10 ${active ? 'translate-y-0 opacity-100' : closedClasses}`}>
            <section className={`relative flex justify-center items-center w-screen min-h-svh ${tone === 'ink' ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
                {children}
            </section>
        </article>
    );
}