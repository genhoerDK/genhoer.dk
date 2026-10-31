'use client';

import { useEffect, useRef } from 'react';
import Label from '@/components/UI/Label';

/** The layers of an interactive work, each with a dot that fills as it is heard */
export default function LayerLegend({ engine }) {
    const dots = useRef([]);

    useEffect(() => {
        if (!engine) return;
        let id;
        const tick = () => {
            id = requestAnimationFrame(tick);
            engine.tracks.forEach((t, i) => {
                const dot = dots.current[i];
                if (!dot) return;
                const gain = t.start === 'press' ? (t.playing ? 1 : 0) : t.gain.gain.value;
                dot.style.transform = `scale(${0.35 + Math.min(1, gain) * 0.65})`;
                dot.style.opacity = String(0.3 + Math.min(1, gain) * 0.7);
            });
        };
        tick();
        return () => cancelAnimationFrame(id);
    }, [engine]);

    if (!engine) return null;

    return (
        <ul className="flex flex-col gap-1.5 animate-fade-in">
            {engine.tracks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2">
                    <span className="relative flex size-2.5 rounded-full ring-1 ring-ink/40">
                        <span ref={(el) => { dots.current[i] = el; }} className="size-full rounded-full bg-ink transition-transform" />
                    </span>
                    <Label>{t.label ?? t.id}</Label>
                </li>
            ))}
        </ul>
    );
}
