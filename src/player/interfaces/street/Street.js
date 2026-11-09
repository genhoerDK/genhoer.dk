'use client';

/**
 * Interface: street — a work that stood in a street, played as you walk it (Kirkestræde).
 *
 * The town round the street lies behind in 3D, seen from above as Tværveje's Nakskov
 * (StreetScene.js, three.js, loaded when the work is opened), in the 3D style (STIL.md). Scrolling
 * walks you down the street and back. On a stretch of it hang the speakers on the facades, in pairs
 * facing each other across it (speakers.js); each pair plays one stereo file, its left channel from
 * the speaker on the left. You hear them all the time, but the ones you stand by much louder than the
 * others, each from its side (the street engine, src/player/audio/Street.js).
 *
 * The timeline at the bottom shows what happens in the street — its chapters are the work's events,
 * each at a pair of speakers — and going somewhere on it does not only spool the sound: it walks you
 * to where that event happens. Over the timeline, where you are in the street and where the pairs hang.
 *
 *   player.street   A street named in src/player/vaerker/streets.js
 *   player.ends     The names at its two ends, as they are walked: [from, to]
 *   player.pairs    The stereo files, one per pair of speakers (see speakers.js), and player.stretch, reach, quietest
 *   player.events   [{ title, start, pair }]  the events on the timeline: from `start` seconds, at pair 1, 2 …
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/player/AudioContext';
import { streets } from '@/player/vaerker/streets';
import { speakersOf, pairAt } from '@/player/interfaces/street/speakers';
import PlayerShell from '@/player/frame/PlayerShell';
import Timeline from '@/player/interfaces/timeline/Timeline';
import Label from '@/components/UI/Label';

/** three.js and the street only load when the work is opened */
const StreetScene = dynamic(() => import('@/player/interfaces/street/StreetScene'), { ssr: false });

export default function StreetPlayer() {
    const { currentTrack, isPlaying, engine } = useAudio();
    const { player } = currentTrack;
    const { street: name, ends = [], events = [] } = player;
    const data = streets[name];
    const [w0, w1] = data.walk;
    const [at, setAt] = useState({ s: w0, f: 0 });

    const speakers = useMemo(() => speakersOf(player), [player]);
    const pairs = speakers.filter((sp) => sp.side < 0);

    /** The sound follows where you are — also an engine made after you walked (the first play) */
    const engineRef = useRef(null);
    const placeRef = useRef(w0);
    useEffect(() => {
        engineRef.current = engine;
        engine?.setPlace?.(placeRef.current);
    }, [engine]);
    const onMove = useCallback((where) => {
        setAt(where);
        placeRef.current = where.s;
        engineRef.current?.setPlace?.(where.s);
    }, []);

    /** The events as the timeline's chapters; going somewhere on it walks you to where that happens */
    const track = useMemo(() => (events.length ? { ...currentTrack, segments: events } : currentTrack), [currentTrack, events]);
    const walkRef = useRef(null);
    const onSeek = useCallback((time) => {
        const event = events.reduce((found, e) => (e.start <= time ? e : found), events[0]);
        const s = event && pairAt(speakers, event.pair);
        if (s != null) walkRef.current?.(s);
    }, [events, speakers]);

    return (
        <PlayerShell track={currentTrack} backdrop={false} model>
            {/* ---------- THE STREET ---------- */}
            <StreetScene data={data} speakers={speakers} sounding={isPlaying} onMove={onMove} walkRef={walkRef} />

            {/* ---------- THE TIMELINE, WITH THE WALK OVER IT ---------- */}
            <Timeline
                track={track}
                onSeek={onSeek}
                hint='Rul eller stryg for at gå i gaden'
                before={
                    <div className='mb-4 md:mb-5 max-w-md' aria-label={`Du står ${Math.round(at.f * 100)} % af vejen fra ${ends[0]} til ${ends[1]}`}>
                        <div className='flex justify-between gap-4'>
                            <Label size='lg' className={at.f < 0.08 ? 'text-paper' : 'text-faint'}>{ends[0]}</Label>
                            <Label size='lg' className={at.f > 0.92 ? 'text-paper' : 'text-faint'}>{ends[1]}</Label>
                        </div>
                        <div className='relative mt-2 h-px bg-paper/25'>
                            {/* where the pairs of speakers hang */}
                            {pairs.map((sp) => (
                                <span key={sp.s} className='absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/50' style={{ left: `${((sp.s - w0) / (w1 - w0)) * 100}%` }} />
                            ))}
                            <span className='absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper' style={{ left: `${Math.min(1, Math.max(0, at.f)) * 100}%` }} />
                        </div>
                    </div>
                }
            />
        </PlayerShell>
    );
}
