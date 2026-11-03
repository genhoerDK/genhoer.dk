'use client';

/**
 * Interface module: timeline for a track with chapters (segments).
 *
 * Top left: the work's title and its place.
 * Bottom, on one line: a round play / pause button, the timeline across the screen — one piece
 * per chapter, as long as the chapter, filled as it plays — and the time. Above the timeline a
 * marker stands at the playing chapter's piece (number + title); hovering the line moves it to
 * the chapter under the pointer.
 *
 * - click / drag on the line to seek
 * - keyboard on the line: ←/→ ±10 s, Home / End; anywhere: space = play / pause, 1–9 = chapter
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

export default function Timeline({ track }) {
    const { isPlaying, currentTime, duration, play, pause, seek } = useAudio();
    const segments = track.segments;
    const lineRef = useRef(null);
    const [scrubbing, setScrubbing] = useState(false);
    const [hover, setHover] = useState(null);   // { index } under the pointer

    // Chapters, as long as they are; equal until the file's duration is known
    const pieces = segments.map((s, i) => {
        const end = segments[i + 1]?.start ?? duration;
        return { ...s, index: i, end, length: duration ? Math.max(end - s.start, 0.001) : 1 };
    });
    const current = pieces.reduce((found, p) => (p.start <= currentTime ? p.index : found), 0);
    const total = pieces.reduce((sum, p) => sum + p.length, 0);
    const leftOf = (i) => (pieces.slice(0, i).reduce((sum, p) => sum + p.length, 0) / total) * 100;   // % along the line

    const togglePlayback = () => (isPlaying ? pause() : play());
    const jumpTo = (i) => {
        seek(segments[i].start);
        if (!isPlaying) play();
    };

    /** Chapter and time at a point on the line */
    const pointAt = (clientX) => {
        const els = [...lineRef.current.querySelectorAll('[data-piece]')];
        for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (clientX <= rect.right || el === els.at(-1)) {
                const p = pieces[Number(el.dataset.piece)];
                const f = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 0.999);
                return { index: p.index, time: p.start + f * (p.end - p.start) };
            }
        }
        return { index: 0, time: 0 };
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

    return (
        <>
            {/* ---------- TITLE, PLACE ---------- */}
            <div className='absolute z-10 left-gutter right-28 top-12 pointer-events-none'>
                <h2 className='leading-none font-extralight text-3xl md:text-5xl'>{track.title}</h2>
                <Label size='lg' className='mt-2 md:mt-3 text-hard'>{track.location}</Label>
            </div>

            {/* ---------- PLAY, TIMELINE, TIME (centred on one line) ---------- */}
            <div className='absolute z-10 inset-x-gutter bottom-24 md:bottom-10 flex items-center gap-3 md:gap-4'>
                <button
                    onClick={togglePlayback}
                    aria-label={isPlaying ? 'Pause' : 'Afspil'}
                    className='shrink-0 flex items-center justify-center size-10 rounded-full bg-ink text-paper cursor-pointer md:hover:bg-hard'
                >
                    {isPlaying ? <PauseIcon className='size-5' /> : <PlayIcon className='size-5 ml-0.5' />}
                </button>

                <div className='relative flex-1 min-w-0'>
                    {/* Chapter marker: at the playing chapter's piece, or the one under the pointer.
                        left + translate by the same % keeps it inside the line at both ends */}
                    <ChapterMarker
                        number={(hover ?? { index: current }).index + 1}
                        count={segments.length}
                        title={segments[(hover ?? { index: current }).index].title}
                        at={leftOf((hover ?? { index: current }).index)}
                        hovering={!!hover}
                    />

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
                        className='py-3 -my-3 cursor-pointer touch-none outline-none group'
                    >
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

                <Label size='lg' className='shrink-0 tabular-nums text-dim'>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </Label>
            </div>
        </>
    );
}

/** Number and title of a chapter, standing above its piece of the line */
function ChapterMarker({ number, count, title, at, hovering }) {
    return (
        <div
            className='absolute bottom-full mb-3 flex items-stretch max-w-full pointer-events-none transition-[left,translate] duration-300 ease-out'
            style={{ left: `${at}%`, translate: `-${at}% 0` }}
        >
            <span className={`flex items-center px-1.5 tabular-nums ${hovering ? 'bg-hard' : 'bg-ink'} text-paper`}>
                <Label size='lg'>{pad(number)}<span className='opacity-50'>/{pad(count)}</span></Label>
            </span>
            <span className='flex items-center min-w-0 px-2 py-1 bg-paper/80'>
                <Label size='lg' className='truncate'>{title}</Label>
            </span>
        </div>
    );
}
