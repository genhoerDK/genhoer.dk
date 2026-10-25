'use client';

import { useState, useEffect, useRef } from 'react';
import { useIsPortrait } from '@/hooks/useIsPortrait';

// Cover image that plays the cover video on hover (desktop only — no video is loaded on mobile)
export default function CardMedia({ vid, img, alt, children }) {
    const isPortrait = useIsPortrait();
    const [hover, setHover] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const video = ref.current;
        if (!video || !vid) return;
        hover ? video.play() : video.pause();
    }, [hover, vid]);

    return (
        <figure className="relative aspect-video my-2 overflow-hidden bg-soft" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {!isPortrait && vid && <video ref={ref} src={vid} playsInline muted loop className="absolute size-full" />}
            <img src={img} alt={alt} loading="lazy" className={`absolute transition-opacity ${vid ? 'md:hover:opacity-0' : ""}`} />
            {children}
        </figure>
    );
}
