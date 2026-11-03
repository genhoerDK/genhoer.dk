'use client';

/**
 * Interface module: timeline for a track with chapters (segments).
 *
 * Top left: the work's title, its place, and the playing chapter (04/05 + title).
 * Bottom: a round play / pause button, then the timeline across the screen — one piece per
 * chapter, as long as the chapter, filled as it plays — with the track's waveform above it,
 * and the time at the end. Hovering the line shows the chapter under the pointer.
 *
 * - click / drag on the line (or the waveform) to seek
 * - keyboard on the line: ←/→ ±10 s, Home / End; anywhere: space = play / pause, 1–9 = chapter
 *
 * The waveform is found by convention: cdn.genhoer.dk/media/<folder>/<name>.mp3 →
 * public/waveforms/<folder>/<name>.json (made with scripts/waveform.py). Without one there is none.
 */

import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Label from '@/components/UI/Label';

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const pad = (n) => String(n).padStart(2, '0');

/** public/waveforms/<folder>/<name>.json for cdn.genhoer.dk/media/<folder>/<name>.mp3 */
export function waveformFor(audio) {
    const match = audio?.match(/\/media\/([^/]+)\/([^/]+?)\.\w+$/);
    return match ? `/waveforms/${match[1]}/${match[2]}.json` : null;
}

/** The waveform, fetched once per track */
function useWaveform(audio) {
    const [data, setData] = useState({ audio: null, levels: null });
    useEffect(() => {
        const url = waveformFor(audio);
        if (!url) return;
        let cancelled = false;
        fetch(url)
            .then((res) => (res.ok ? res.json() : null))
            .then((levels) => { if (!cancelled) setData({ audio, levels }); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [audio]);
    return data.audio === audio ? data.levels : null;
}

/** The element's width, kept up to date */
function useWidth(ref) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}

export default function Timeline({ track }) {
    const { isPlaying, currentTime, duration, play, pause, seek } = useAudio();
    const segments = track.segments;
    const lineRef = useRef(null);
    const [scrubbing, setScrubbing] = useState(false);
    const [hover, setHover] = useState(null);   // { x, index } under the pointer

    const levels = useWaveform(track.audio);
    const lineWidth = useWidth(lineRef);
    const barCount = Math.floor(lineWidth / 4);   // about one waveform bar per 4 px

    // Chapters, as long as they are; equal until the file's duration is known
    const pieces = segments.map((s, i) => {
        const end = segments[i + 1]?.start ?? duration;
        return { ...s, index: i, end, length: duration ? Math.max(end - s.start, 0.001) : 1 };
    });
    const current = pieces.reduce((found, p) => (p.start <= currentTime ? p.index : found), 0);
    const progress = duration ? currentTime / duration : 0;

    const togglePlayback = () => (isPlaying ? pause() : play());
    const jumpTo = (i) => {
        seek(segments[i].start);
        if (!isPlaying) play();
    };

    /** Chapter and time at a point on the line */
    const pointAt = (clientX) => {
        const els = [...lineRef.current.querySelectorAll('[data-piece]')];
        const lineRect = lineRef.current.getBoundingClientRect();
        for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (clientX <= rect.right || el === els.at(-1)) {
                const p = pieces[Number(el.dataset.piece)];
                const f = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 0.999);
                return { index: p.index, time: p.start + f * (p.end - p.start), x: clientX - lineRect.left };
            }
        }
        return { index: 0, time: 0, x: 0 };
    };

    const onPointerDown = (e) => {
        if (!duration) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setScrubbing(true);
        seek(pointAt(e.clientX).time);
    };
    const onPointerMove = (e) => {
        const point = pointAt(e.clientX);
        if (e.pointerType === 'mouse' || scrubbing) setHover(point);
        if (scrubbing && duration) seek(point.time);
    };
    const onPointerUp = (e) => {
        setScrubbing(false);
        if (e.pointerType !== 'mouse') setHover(null);
    };

    const onKeyDown = (e) => {
        const step = { ArrowRight: 10, ArrowLeft: -10 }[e.key];
        if (step) { e.preventDefault(); seek(Math.min(Math.max(currentTime + step, 0), duration)); }
        if (e.key === 'Home') { e.preventDefault(); seek(0); }
        if (e.key === 'End') { e.preventDefault(); seek(segments.at(-1).start); }
    };

    /** Space = play / pause and 1–9 = chapter, anywhere in the player */
    const keys = useRef({});
    useEffect(() => { keys.current = { togglePlayback, jumpTo }; });
    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat || e.target.closest?.('input, textarea, button, [role="slider"]')) return;
            if (e.key === ' ') { e.preventDefault(); keys.current.togglePlayback(); }
            const n = Number(e.key);
            if (n >= 1 && n <= segments.length) keys.current.jumpTo(n - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [segments.length]);

    // Waveform resampled to fit the width
    const bars = levels && barCount > 0
        ? Array.from({ length: barCount }, (_, i) => {
            const from = Math.floor((i / barCount) * levels.length);
            const to = Math.max(from + 1, Math.floor(((i + 1) / barCount) * levels.length));
            return Math.max(...levels.slice(from, to));
        })
        : null;

    return (
        <>
            {/* ---------- TITLE, PLACE, CHAPTER ---------- */}
            <div className='absolute z-10 left-gutter right-28 top-12 pointer-events-none'>
                <h2 className='leading-none font-extralight text-3xl md:text-5xl'>{track.title}</h2>
                <Label size='lg' className='mt-2 md:mt-3 text-hard'>{track.location}</Label>
                <div className='flex items-center gap-2 mt-4 md:mt-6 min-w-0'>
                    <span className='shrink-0 border border-ink px-1.5 py-1'>
                        <Label size='lg' className='tabular-nums'>
                            {pad(current + 1)}<span className='text-faint'>/{pad(segments.length)}</span>
                        </Label>
                    </span>
                    <Label size='lg' className='truncate'>{segments[current]?.title}</Label>
                </div>
            </div>

            {/* ---------- PLAY, TIMELINE, TIME ---------- */}
            <div className='absolute z-10 inset-x-gutter bottom-24 md:bottom-8 flex items-center gap-3 md:gap-4'>
                <button
                    onClick={togglePlayback}
                    aria-label={isPlaying ? 'Pause' : 'Afspil'}
                    className='shrink-0 flex items-center justify-center size-10 rounded-full bg-ink text-paper cursor-pointer md:hover:bg-hard'
                >
                    {isPlaying ? <PauseIcon className='size-5' /> : <PlayIcon className='size-5 ml-0.5' />}
                </button>

                <div className='relative flex-1 min-w-0'>
                    {/* Chapter under the pointer */}
                    {hover && (
                        <div
                            className='absolute bottom-full mb-1 -translate-x-1/2 px-2 py-1 bg-ink text-paper whitespace-nowrap pointer-events-none'
                            style={{ left: Math.min(Math.max(hover.x, 60), lineWidth - 60) }}
                        >
                            <Label>{pad(hover.index + 1)} · {segments[hover.index].title}</Label>
                        </div>
                    )}

                    <div
                        ref={lineRef}
                        role='slider'
                        tabIndex={0}
                        aria-label='Afspilningsposition'
                        aria-valuemin={0}
                        aria-valuemax={Math.round(duration)}
                        aria-valuenow={Math.round(currentTime)}
                        aria-valuetext={`${formatTime(currentTime)} af ${formatTime(duration)}, ${segments[current]?.title}`}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onPointerLeave={() => !scrubbing && setHover(null)}
                        onKeyDown={onKeyDown}
                        className='pt-1 pb-2 cursor-pointer touch-none outline-none group'
                    >
                        {/* Waveform */}
                        <div className='flex items-end gap-px h-4 mb-1'>
                            {bars?.map((level, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 ${i / bars.length < progress ? 'bg-ink/60' : 'bg-ink/20'}`}
                                    style={{ height: `${Math.max(8, level)}%` }}
                                />
                            ))}
                        </div>

                        {/* One piece per chapter */}
                        <div className='flex gap-0.5'>
                            {pieces.map((p) => {
                                const filled = duration ? Math.min(Math.max((currentTime - p.start) / (p.end - p.start), 0), 1) : 0;
                                const lit = p.index === current || hover?.index === p.index;
                                return (
                                    <div
                                        key={p.index}
                                        data-piece={p.index}
                                        style={{ flexGrow: p.length, flexBasis: 0 }}
                                        className={`relative h-2 ${lit ? 'bg-ink/30' : 'bg-ink/15'} group-focus-visible:bg-ink/30`}
                                    >
                                        <div className='absolute inset-y-0 left-0 bg-ink' style={{ width: `${filled * 100}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <Label size='lg' className='shrink-0 tabular-nums text-hard'>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </Label>
            </div>
        </>
    );
}
