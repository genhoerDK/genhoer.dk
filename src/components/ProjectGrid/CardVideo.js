import { useEffect, useRef } from "react";

export default function CardVideo({ play = false, src }) {
    const ref = useRef(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        play ? video.play() : video.pause();
    }, [play]);

    return <video ref={ref} src={src} playsInline muted loop className="object-cover aspect-video" />;
}