'use client';

/**
 * Background module: a photo (and drifting smoke) behind any player interface — see stage.js.
 * Changing `image` cross-fades to the new photo.
 *
 * Load it with next/dynamic (ssr: false) so three.js only loads when it's shown.
 *
 * @param {string} image   Photo URL
 * @param {number} [focus] 0–1 across the photo: what stays in view on narrow screens
 * @param {number} [smoke] 0–1: how much smoke drifts in front of the photo
 */

import { useEffect, useRef } from 'react';
import { createStage } from '@/player/scene/stage';

export default function PhotoBackdrop({ image, focus = 0.5, smoke = 1 }) {
    const containerRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
        const stage = createStage(containerRef.current, { focus, smoke });
        stage.start();
        stageRef.current = stage;
        return () => {
            stage.dispose();
            stageRef.current = null;
        };
    }, [focus, smoke]);

    useEffect(() => {
        if (image) stageRef.current?.setBackdrop(image);
    }, [image, focus]);

    return <div ref={containerRef} className='absolute inset-0' aria-hidden='true' />;
}
