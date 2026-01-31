'use client';

import { useState, useEffect, useRef } from 'react';

export default function CardMedia({ vid, img, alt, children }) {
    const [hover, setHover] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const video = ref.current;
        if (!video || !vid) return;
        hover ? video.play() : video.pause();
    }, [hover]);

    return (
        <figure className="relative aspect-video my-2 overflow-hidden" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {vid && <video ref={ref} src={vid} playsInline muted loop className="hidden absolute size-full object-cover md:block" />}
            <img src={img} alt={alt} loading="lazy" className={`absolute ${vid ? 'md:hover:opacity-0' : ""}`} />
            {children}
        </figure>
    );
}