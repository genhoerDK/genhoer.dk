'use client';

/**
 * The frame every interface sits in — the listening room:
 *
 *  - the work's photo behind (with depth, see scene/DepthBackdrop.js), black and white, dimmed,
 *    with grain, darker towards the top and the bottom. `filter` puts a CSS filter on the photo
 *    (Under overfladen blurs it under the surface).
 *  - the interface's controls as children. <Controls> is the bar at the bottom they go in, with
 *    the work's title (small) and, where one is needed, a line on how it's played.
 *
 * Dark on purpose: the project page's hero is dark too, so opening a work feels like stepping
 * from the page into the room where it plays. three.js only loads when a player is opened.
 *
 * @param {object} track      The project
 * @param {string} [image]    Photo URL (default: the player's image, then the landscape cover)
 * @param {string} [depth]    Depth map URL (default: the one made for the photo, if any)
 * @param {number} [focus]    0–1 across the photo: what stays in view on narrow screens
 * @param {number} [smoke]    0–1: how much smoke drifts in front of the photo
 * @param {boolean} [backdrop] false: the interface draws its own scene (Troldetoner, Kanon i G3)
 * @param {string} [filter]   CSS filter on the photo, with [filterTransition] (a CSS transition value)
 */

import dynamic from 'next/dynamic';
import Label from '@/components/UI/Label';
import { depthMapFor } from '@/player/scene/depth';

const DepthBackdrop = dynamic(() => import('@/player/scene/DepthBackdrop'), { ssr: false });

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function PlayerShell({ track, image, depth, focus, smoke = 0.4, backdrop = true, filter, filterTransition, children }) {
    const photo = image ?? track?.player?.image ?? track?.coverImageLandscape;

    return (
        <div className='relative w-full h-page bg-ink text-paper overflow-hidden select-none'>
            {/* The photo, black and white like the covers so a gallery photo fits in too */}
            {backdrop && (
                <div className='absolute inset-0' style={{ filter: ['grayscale(1)', filter].filter(Boolean).join(' '), transition: filterTransition }}>
                    <DepthBackdrop image={photo} depth={depth ?? depthMapFor(photo)} focus={focus} smoke={smoke} />
                    <div className='absolute inset-0 bg-ink/30' />
                </div>
            )}

            {/* Grain and the dark edges */}
            <div className='absolute inset-0 pointer-events-none opacity-10' style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />
            <div className='absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/80 to-transparent pointer-events-none' />
            {backdrop && <div className='absolute inset-x-0 bottom-0 h-80 bg-linear-to-t from-ink via-ink/70 to-transparent pointer-events-none' />}

            {children}
        </div>
    );
}

/**
 * The bar at the bottom where an interface's controls go (above the toolbar on phones), with the
 * work's title over them and, if given, one line on how it's played.
 *
 * @param {string} [title]
 * @param {string} [hint]
 * @param {'left'|'center'} [align]  Title and hint to the left, or centred over centred controls
 */
export function Controls({ title, hint, align = 'left', className = '', children }) {
    return (
        <div className={`absolute z-10 inset-x-gutter bottom-16 md:bottom-10 ${align === 'center' ? 'flex flex-col items-center' : ''}`}>
            {(title || hint) && (
                <div className={`mb-3 md:mb-4 ${align === 'center' ? 'text-center' : ''}`}>
                    {title && <h2 className='leading-none font-extralight text-lg md:text-xl'>{title}</h2>}
                    {hint && <Label size='lg' className={`text-faint ${title ? 'mt-1.5' : ''}`}>{hint}</Label>}
                </div>
            )}
            <div className={className}>{children}</div>
        </div>
    );
}

/** A line of status: loading, or a problem */
export function Status({ children, pulse = false }) {
    return <Label size='lg' className={`text-faint ${pulse ? 'animate-pulse' : ''}`}>{children}</Label>;
}
