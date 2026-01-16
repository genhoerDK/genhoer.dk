'use client';

import { useState } from 'react';
import { useIsPortrait } from "@/hooks/useIsPortrait";
import CardImage from "@/components/ProjectGrid/CardImage";
import CardVideo from "@/components/ProjectGrid/CardVideo";

export default function CardMedia({ alt, img, vid, children }) {
    const isPortrait = useIsPortrait();
    const [isPlaying, setIsPlaying] = useState(false);

    const handleHover = (e) => setIsPlaying(e.type === 'mouseenter'); // Set playing state to true when hovering

    return (
        <div className="relative aspect-video my-2 overflow-hidden bg-zinc-200 group" onMouseEnter={handleHover} onMouseLeave={handleHover}>
            <figure className={`absolute inset-0 transition duration-300 group-hover:scale-105 ${vid && "md:group-hover:opacity-0"}`}>
                <CardImage alt={alt} src={img} />
            </figure>
            {!isPortrait && vid &&
                <figure className="absolute inset-0 transition duration-300 opacity-0 group-hover:opacity-100 hidden md:block"> 
                    <CardVideo play={isPlaying} src={vid} />
                </figure>
            }
            {children}
        </div>
    );
}