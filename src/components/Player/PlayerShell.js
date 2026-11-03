'use client';

/**
 * The frame every interface sits in — the listening room:
 *
 *  - the work's photo behind (with depth, see scene/DepthBackdrop.js), dimmed, with grain, and
 *    darker towards the top and the bottom so the title and the controls read on any photo.
 *    `filter` puts a CSS filter on the photo (Under overfladen blurs it under the surface).
 *  - top left: the work's title, its place and a one-line hint on how it's played
 *  - the interface's controls as children; <Controls> puts them in the bar at the bottom
 *
 * Dark on purpose: the project page's hero is dark too, so opening a work feels like stepping
 * from the page into the room where it plays. three.js only loads when a player is opened.
 *
 * @param {object} track      The project
 * @param {string} [image]    Photo URL (default: the player's image, then the landscape cover)
 * @param {string} [depth]    Depth map URL (default: the one made for the photo, if any)
 * @param {number} [focus]    0–1 across the photo: what stays in view on narrow screens
 * @param {number} [smoke]    0–1: how much smoke drifts in front of the photo
 * @param {boolean} [backdrop] false: the interface draws its own scene (Troldetoner's buttons)
 * @param {string} [filter]   CSS filter on the photo, with [filterTransition] (a CSS transition value)
 * @param {string} [hint]     How it's played, one line
 */

import dynamic from 'next/dynamic';
import Label from '@/components/UI/Label';
import Text from '@/components/UI/Text';
import { depthMapFor } from '@/components/Player/scene/depth';

const DepthBackdrop = dynamic(() => import('@/components/Player/scene/DepthBackdrop'), { ssr: false });

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function PlayerShell({ track, image, depth, focus, smoke = 0.4, backdrop = true, filter, filterTransition, hint, children }) {
    const photo = image ?? track?.player?.image ?? track?.coverImageLandscape;

    return (
        <div className='relative w-full h-svh bg-ink text-paper overflow-hidden select-none'>
            {/* The photo, black and white like the covers so a gallery photo fits in too */}
            {backdrop && (
                <div className='absolute inset-0' style={{ filter: ['grayscale(1)', filter].filter(Boolean).join(' '), transition: filterTransition }}>
                    <DepthBackdrop image={photo} depth={depth ?? depthMapFor(photo)} focus={focus} smoke={smoke} />
                    <div className='absolute inset-0 bg-ink/30' />
                </div>
            )}

            {/* Grain and the dark edges */}
            <div className='absolute inset-0 pointer-events-none opacity-10' style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />
            <div className='absolute inset-x-0 top-0 h-64 bg-linear-to-b from-ink/85 via-ink/40 to-transparent pointer-events-none' />
            {backdrop && <div className='absolute inset-x-0 bottom-0 h-80 bg-linear-to-t from-ink via-ink/70 to-transparent pointer-events-none' />}

            {/* ---------- TITLE, PLACE, HINT ---------- */}
            <div className='absolute z-10 left-gutter right-gutter top-12 pointer-events-none animate-fade-in'>
                <h2 className='leading-none font-extralight text-3xl md:text-5xl'>{track.title}</h2>
                <Label size='lg' className='mt-2 md:mt-3 text-faint'>{track.location}</Label>
                {hint && <Text size='small' className='mt-4 max-w-xs text-muted'>{hint}</Text>}
            </div>

            {children}
        </div>
    );
}

/** The bar at the bottom where an interface's controls go (above the toolbar on phones) */
export function Controls({ className = '', children }) {
    return <div className={`absolute z-10 inset-x-gutter bottom-16 md:bottom-10 ${className}`}>{children}</div>;
}

/** A line of status under the controls: loading, or a problem */
export function Status({ children, pulse = false }) {
    return <Label size='lg' className={`text-faint ${pulse ? 'animate-pulse' : ''}`}>{children}</Label>;
}
