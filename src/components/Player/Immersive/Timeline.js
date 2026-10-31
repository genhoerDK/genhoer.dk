'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Label from '@/components/UI/Label';
import { envelopeAtFraction } from './useAudioEnvelope';

/**
 * Linear timeline split into chapters. Drag anywhere to scrub; the chapter
 * under the pointer is named above it. The fill is driven by animation frames
 * so it moves smoothly instead of in timeupdate steps.
 */
export default function Timeline({ segments, duration, getTime, seek, envelope }) {
    const trackRef = useRef(null);
    const fillRef = useRef(null);
    const timeRef = useRef(null);
    const [scrub, setScrub] = useState(null);   // fraction while dragging
    const [hover, setHover] = useState(null);   // fraction under pointer
    const scrubRef = useRef(null);
    useLayoutEffect(() => { scrubRef.current = scrub; }, [scrub]);

    /* Smooth progress */
    useEffect(() => {
        let id;
        const tick = () => {
            id = requestAnimationFrame(tick);
            const t = scrubRef.current !== null ? scrubRef.current * duration : getTime();
            const f = duration ? Math.min(t / duration, 1) : 0;
            if (fillRef.current) fillRef.current.style.clipPath = `inset(0 ${100 - f * 100}% 0 0)`;
            if (timeRef.current) timeRef.current.textContent = `${format(t)} / ${format(duration)}`;
        };
        tick();
        return () => cancelAnimationFrame(id);
    }, [duration, getTime]);

    const fractionAt = (e) => {
        const rect = trackRef.current.getBoundingClientRect();
        return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    };

    // Whether a drag is in progress is kept in a ref too, so a quick click (down and up
    // before React re-renders) still seeks
    const dragging = useRef(false);
    const onDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        setScrub(fractionAt(e));
    };
    const onMove = (e) => {
        const f = fractionAt(e);
        setHover(f);
        if (dragging.current) setScrub(f);
    };
    const onUp = (e) => {
        if (!dragging.current) return;
        dragging.current = false;
        seek(fractionAt(e) * duration);
        setScrub(null);
    };

    const spans = (segments.length ? segments : [{ start: 0, title: '' }]).map((s, i, all) => ({
        start: duration ? Math.min(1, s.start / duration) : 0,
        end: duration ? Math.min(1, (all[i + 1]?.start ?? duration) / duration) : 1,
        title: s.title,
        index: i,
    }));

    const pointerAt = scrub ?? hover;
    const named = pointerAt !== null ? spans.find((s) => pointerAt >= s.start && pointerAt < s.end) : null;

    // A small waveform inside the track, when the sound has been analysed
    const bars = envelope && !envelope.synthetic ? Array.from({ length: 160 }, (_, i) => envelopeAtFraction(envelope, i / 159)) : null;

    const chapterBlocks = (filled) => spans.map((s) => (
        <div key={s.index} className={`absolute top-0 h-full ${filled ? 'bg-ink' : 'bg-muted'}`} style={{ left: `calc(${s.start * 100}% + ${s.index ? 2 : 0}px)`, width: `calc(${(s.end - s.start) * 100}% - ${s.index ? 2 : 0}px)` }} />
    ));

    return (
        <div className="relative flex-1 min-w-0 flex items-center gap-3">
            <div
                ref={trackRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={() => setHover(null)}
                className="group relative flex-1 h-10 cursor-pointer touch-none"
            >
                {named?.title && (
                    <div className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 whitespace-nowrap bg-ink text-paper px-2 py-1" style={{ left: `clamp(4rem, ${pointerAt * 100}%, calc(100% - 4rem))` }}>
                        <Label>{String(named.index + 1).padStart(2, '0')} · {named.title}</Label>
                    </div>
                )}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 group-hover:h-3 transition-[height] duration-200">
                    {bars && (
                        <div className="absolute inset-x-0 bottom-full mb-1 h-4 flex items-end gap-px opacity-60">
                            {bars.map((v, i) => <div key={i} className="flex-1 bg-ink/50" style={{ height: `${Math.max(6, v * 100)}%` }} />)}
                        </div>
                    )}
                    {chapterBlocks(false)}
                    <div ref={fillRef} className="absolute inset-0">{chapterBlocks(true)}</div>
                </div>
            </div>
            <span ref={timeRef} className="hidden sm:block shrink-0 text-[0.625rem] tabular-nums text-hard" />
        </div>
    );
}

function format(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
