'use client';

/**
 * Background module: a photo with depth (and drifting smoke) behind any player interface —
 * see stage.js. Changing `image` cross-fades to the new photo.
 *
 * Load it with next/dynamic (ssr: false) so three.js only loads when it's shown.
 *
 * @param {string} image   Photo URL
 * @param {string} [depth] Depth map URL (light = near). Without one the photo moves as a flat layer
 * @param {number} [focus] 0–1 across the photo: what stays in view on narrow screens
 */

import { useEffect, useRef } from 'react';
import { createStage } from '@/components/Player/scene/stage';

export default function DepthBackdrop({ image, depth, focus = 0.5 }) {
    const containerRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
        const stage = createStage(containerRef.current, { focus });
        stage.start();
        stageRef.current = stage;
        return () => {
            stage.dispose();
            stageRef.current = null;
        };
    }, [focus]);

    useEffect(() => {
        if (image) stageRef.current?.setBackdrop(image, depth);
    }, [image, depth, focus]);

    return <div ref={containerRef} className='absolute inset-0' aria-hidden='true' />;
}
