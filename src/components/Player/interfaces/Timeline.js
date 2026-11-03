'use client';

/**
 * Interface: timeline — for a work that is one file, with or without chapters (segments).
 *
 * In the bar at the bottom: the work's title, then the chapter marker (number + title) at the
 * left, which names the playing chapter — or the one under the pointer — and opens the list of
 * chapters. Under it, on one line: a round play / pause button, the timeline across the screen —
 * one piece per chapter, as long as the chapter, filled as it plays, with a needle at the
 * playing position — and the time.
 *
 *  - tap / click / drag on the line to seek
 *  - keyboard on the line: ←/→ ±10 s, Home / End; anywhere: space = play / pause, 1–9 = chapter,
 *    Escape closes the list
 */

import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Label from '@/components/UI/Label';
import { Controls } from '@/components/Player/PlayerShell';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const pad = (n) => String(n).padStart(2, '0');

export default function Timeline({ track }) {
    const { isPlaying, buffering, currentTime, duration, play, pause, seek } = useAudio();
    const segments = track.segments?.length ? track.segments : [{ title: track.title, start: 0 }];
    const hasChapters = segments.length > 1;
    const lineRef = useRef(null);
    const listRef = useRef(null);
    const [scrubbing, setScrubbing] = useState(false);
    const [hover, setHover] = useState(null);   // { index, time } under the pointer
    const [listOpen, setListOpen] = useState(false);

    // Chapters, as long as they are; equal until the file's duration is known
    const pieces = segments.map((s, i) => {
        const end = segments[i + 1]?.start ?? duration;
        return { ...s, index: i, end, length: duration ? Math.max(end - s.start, 0.001) : 1 };
    });
    const current = pieces.reduce((found, p) => (p.start <= currentTime ? p.index : found), 0);
    const total = pieces.reduce((sum, p) => sum + p.length, 0);
    const leftOf = (i) => (pieces.slice(0, i).reduce((sum, p) => sum + p.length, 0) / total) * 100;   // % along the line, for the needle
    const filledOf = (p) => (duration ? Math.min(Math.max((currentTime - p.start) / (p.end - p.start), 0), 1) : 0);
    const needle = leftOf(current) + (pieces[current].length / total) * 100 * filledOf(pieces[current]);

    const togglePlayback = () => (isPlaying ? pause() : play());
    const jumpTo = (i) => {
        seek(segments[i].start);
        if (!isPlaying) play();
    };

    /* ---------- POINTER ON THE LINE ---------- */

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
        setListOpen(false);
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

    /* ---------- KEYBOARD ---------- */

    const onKeyDown = (e) => {
        const step = { ArrowRight: 10, ArrowLeft: -10 }[e.key];
        if (step) { e.preventDefault(); seek(Math.min(Math.max(currentTime + step, 0), duration)); }
        if (e.key === 'Home') { e.preventDefault(); seek(0); }
        if (e.key === 'End') { e.preventDefault(); seek(segments.at(-1).start); }
    };

    /** Space = play / pause, 1–9 = chapter and Escape = close the list, anywhere in the player */
    const keys = useRef({});
    useEffect(() => { keys.current = { togglePlayback, jumpTo }; });
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') setListOpen(false);
            if (e.repeat || keyIsTaken(e)) return;
            if (e.key === ' ') { e.preventDefault(); keys.current.togglePlayback(); }
            const n = Number(e.key);
            if (n >= 1 && n <= segments.length) keys.current.jumpTo(n - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [segments.length]);

    /** A tap outside the list closes it */
    useEffect(() => {
        if (!listOpen) return;
        const onPointer = (e) => { if (!listRef.current?.contains(e.target)) setListOpen(false); };
        window.addEventListener('pointerdown', onPointer);
        return () => window.removeEventListener('pointerdown', onPointer);
    }, [listOpen]);

    const shown = hover ?? { index: current };

    return (
        <Controls title={track.title}>
            {/* ---------- MARKER / LIST (the list opens upwards from the marker's place) ---------- */}
            <div className='relative mb-3 h-7'>
                {listOpen ? (
                    <ChapterList ref={listRef} pieces={pieces} current={current} onPick={(i) => { jumpTo(i); setListOpen(false); }} onClose={() => setListOpen(false)} />
                ) : (
                    <ChapterMarker
                        number={shown.index + 1}
                        count={segments.length}
                        title={segments[shown.index].title}
                        hovering={!!hover && shown.index !== current}
                        onClick={hasChapters ? () => setListOpen(true) : undefined}
                    />
                )}
            </div>

            <div className='flex items-center gap-3 md:gap-4'>
            {/* ---------- PLAY / PAUSE ---------- */}
            <button
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause' : 'Afspil'}
                className='shrink-0 flex items-center justify-center size-12 md:size-11 rounded-full bg-paper text-ink cursor-pointer transition-colors md:hover:bg-muted'
            >
                {isPlaying ? <PauseIcon className='size-5' /> : <PlayIcon className='size-5 ml-0.5' />}
            </button>

            {/* ---------- THE LINE ---------- */}
            <div className='relative flex-1 min-w-0'>
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
                    className='relative py-4 -my-4 cursor-pointer touch-none outline-none group'
                >
                    {/* One piece per chapter */}
                    <div className='flex gap-0.5'>
                        {pieces.map((p) => {
                            const lit = p.index === current || hover?.index === p.index;
                            return (
                                <div
                                    key={p.index}
                                    data-piece={p.index}
                                    style={{ flexGrow: p.length, flexBasis: 0 }}
                                    className={`relative h-1.5 transition-colors ${lit ? 'bg-paper/40' : 'bg-paper/20'} group-focus-visible:bg-paper/40`}
                                >
                                    <div className='absolute inset-y-0 left-0 bg-paper' style={{ width: `${filledOf(p) * 100}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    {/* The needle */}
                    {duration > 0 && (
                        <div className='absolute top-1/2 w-0.5 h-4 -translate-y-1/2 bg-paper rounded-full pointer-events-none' style={{ left: `calc(${needle}% - 1px)` }} />
                    )}
                </div>
            </div>

            {/* ---------- TIME ---------- */}
            <Label size='lg' className='shrink-0 tabular-nums text-muted'>
                {buffering && isPlaying ? <span className='animate-pulse'>Henter …</span> : <>{formatTime(currentTime)} <span className='text-hard'>/ {formatTime(duration)}</span></>}
            </Label>
            </div>
        </Controls>
    );
}

/** Number and title of a chapter. Opens the list when there are chapters */
function ChapterMarker({ number, count, title, hovering, onClick }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            onClick={onClick}
            aria-haspopup={onClick ? 'listbox' : undefined}
            aria-label={onClick ? `Kapitel ${number} af ${count}: ${title}. Vis kapitlerne` : undefined}
            className={`flex items-stretch max-w-full group/marker ${onClick ? 'cursor-pointer' : 'pointer-events-none'}`}
        >
            <span className={`flex items-center px-1.5 tabular-nums transition-colors ${hovering ? 'bg-muted' : 'bg-paper'} text-ink`}>
                <Label size='lg'>{pad(number)}<span className='opacity-50'>/{pad(count)}</span></Label>
            </span>
            <span className='flex items-center gap-1 min-w-0 pl-2 pr-1.5 py-1.5 bg-ink/70 backdrop-blur-sm text-paper transition-colors md:group-hover/marker:bg-shade'>
                <Label size='lg' className='truncate'>{title}</Label>
                {onClick && <ChevronUpIcon className='size-3.5 shrink-0 text-faint' />}
            </span>
        </Tag>
    );
}

/** The chapters, to jump between */
function ChapterList({ ref, pieces, current, onPick, onClose }) {
    return (
        <div ref={ref} role='listbox' aria-label='Kapitler' className='absolute bottom-0 left-0 w-full max-w-sm max-h-[55svh] overflow-y-auto bg-ink/85 backdrop-blur-md text-paper'>
            <div className='flex items-center justify-between pl-3 pr-1 py-1 border-b border-paper/10'>
                <Label size='lg' className='text-faint'>Kapitler</Label>
                <button onClick={onClose} aria-label='Luk' className='p-1.5 cursor-pointer text-faint md:hover:text-paper'><XMarkIcon className='size-4' /></button>
            </div>
            {pieces.map((p) => (
                <button
                    key={p.index}
                    role='option'
                    aria-selected={p.index === current}
                    onClick={() => onPick(p.index)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors md:hover:bg-shade ${p.index === current ? 'bg-paper/10' : ''}`}
                >
                    <Label size='lg' className='w-5 tabular-nums text-faint'>{pad(p.index + 1)}</Label>
                    <Label size='lg' className='flex-1 truncate'>{p.title}</Label>
                    <Label size='lg' className='tabular-nums text-faint'>{formatTime(p.start)}</Label>
                </button>
            ))}
        </div>
    );
}
