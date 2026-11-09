'use client';

/**
 * Interface: street — a work that stood in a street, played as you walk it (Kirkestræde).
 *
 * The town round the street lies behind in 3D, seen from above as Tværveje's Nakskov
 * (StreetScene.js, three.js, loaded when the work is opened), in the 3D style (STIL.md). You stand
 * at one of the pairs of speakers and step to the next or the one before by scrolling, dragging or
 * the arrow keys. On a stretch of the street hang the speakers on the facades, in pairs
 * facing each other across it (speakers.js); each pair plays one stereo file, its left channel from
 * the speaker on the left. You hear them all the time, but the ones you stand by much louder than the
 * others, each from its side (the street engine, src/player/audio/Street.js).
 *
 * The timeline at the bottom shows what happens in the street — its chapters are the work's events,
 * each at a pair of speakers — and going somewhere on it does not only spool the sound: it walks you
 * to where that event happens.
 *
 *   player.street   A street named in src/player/vaerker/streets.js
 *   player.pairs    The stereo files, one per pair of speakers (see speakers.js), and player.stretch, hear
 *   player.events   [{ title, start, pair }]  the events on the timeline: from `start` seconds, at pair 1, 2 …
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/player/AudioContext';
import { streets } from '@/player/vaerker/streets';
import { speakersOf, pairAt } from '@/player/interfaces/street/speakers';
import PlayerShell from '@/player/frame/PlayerShell';
import Timeline from '@/player/interfaces/timeline/Timeline';

/** three.js and the street only load when the work is opened */
const StreetScene = dynamic(() => import('@/player/interfaces/street/StreetScene'), { ssr: false });

export default function StreetPlayer() {
    const { currentTrack, isPlaying, engine } = useAudio();
    const { player } = currentTrack;
    const { street: name, events = [] } = player;
    const data = streets[name];
    const [w0] = data.walk;

    const speakers = useMemo(() => speakersOf(player), [player]);
    const stops = useMemo(() => speakers.filter((sp) => sp.side < 0).map((sp) => sp.s), [speakers]);   // you stand at a pair

    /** The sound follows where you are — also an engine made after you walked (the first play) */
    const engineRef = useRef(null);
    const placeRef = useRef(w0);
    useEffect(() => {
        engineRef.current = engine;
        engine?.setPlace?.(placeRef.current);
    }, [engine]);
    const onMove = useCallback((where) => {
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
            <StreetScene data={data} speakers={speakers} stops={stops} sounding={isPlaying} onMove={onMove} walkRef={walkRef} />

            {/* ---------- THE TIMELINE: the events in the street ---------- */}
            <Timeline
                track={track}
                onSeek={onSeek}
            />
        </PlayerShell>
    );
}
