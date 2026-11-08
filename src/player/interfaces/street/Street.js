'use client';

/**
 * Interface: street — a work that stood in a street, played as you walk it (Kirkestræde).
 *
 * The town round the street lies behind in 3D, seen from above as Tværveje's Nakskov
 * (StreetScene.js, three.js, loaded when the work is opened), in the 3D style (STIL.md). Scrolling
 * walks you down the street and back, past the speakers on the facades, half on either side. The
 * work plays as one file, with its chapters, on the timeline at the bottom; over the timeline, where
 * you are in the street and where the speakers hang. The further you are from the nearest speaker,
 * the quieter the work (where the phone lets the page set it).
 *
 *   player.street   A street named in src/player/vaerker/streets.js
 *   player.ends     The names at its two ends, as they are walked: [from, to]
 *   player.speakers How many speakers, spread evenly along the walk, every other on each side (default 8)
 *   player.reach    Metres from the nearest speaker over which the sound falls to its quietest (default 40)
 *   player.quietest 0–1: how quiet it gets furthest away (default 0.3)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/player/AudioContext';
import { streets } from '@/player/vaerker/streets';
import PlayerShell from '@/player/frame/PlayerShell';
import Timeline from '@/player/interfaces/timeline/Timeline';
import Label from '@/components/UI/Label';

/** three.js and the street only load when the work is opened */
const StreetScene = dynamic(() => import('@/player/interfaces/street/StreetScene'), { ssr: false });

export default function StreetPlayer() {
    const { currentTrack, isPlaying, setVolume } = useAudio();
    const { street: name, ends = [], speakers: count = 8, reach = 40, quietest = 0.3 } = currentTrack.player;
    const data = streets[name];
    const [at, setAt] = useState({ s: data.walk[0], f: 0 });

    // The speakers, spread evenly along the walk, every other on the left and on the right
    const [w0, w1] = data.walk;
    const speakers = useMemo(() => Array.from({ length: count }, (_, i) => ({ s: w0 + ((i + 0.5) / count) * (w1 - w0), side: i % 2 ? 1 : -1 })), [count, w0, w1]);

    /** Quieter the further from the nearest speaker */
    const onMove = useCallback((where) => {
        setAt(where);
        const away = Math.min(...speakers.map((sp) => Math.abs(where.s - sp.s)));
        setVolume(quietest + (1 - quietest) * Math.exp(-away / (reach / 2.5)));
    }, [speakers, reach, quietest, setVolume]);
    useEffect(() => () => setVolume(1), [setVolume]);

    return (
        <PlayerShell track={currentTrack} backdrop={false} model>
            {/* ---------- THE STREET ---------- */}
            <StreetScene data={data} speakers={speakers} sounding={isPlaying} onMove={onMove} />

            {/* ---------- THE TIMELINE, WITH THE WALK OVER IT ---------- */}
            <Timeline
                track={currentTrack}
                hint='Rul eller stryg for at gå i gaden'
                before={
                    <div className='mb-4 md:mb-5 max-w-md' aria-label={`Du står ${Math.round(at.f * 100)} % af vejen fra ${ends[0]} til ${ends[1]}`}>
                        <div className='flex justify-between gap-4'>
                            <Label size='lg' className={at.f < 0.08 ? 'text-paper' : 'text-faint'}>{ends[0]}</Label>
                            <Label size='lg' className={at.f > 0.92 ? 'text-paper' : 'text-faint'}>{ends[1]}</Label>
                        </div>
                        <div className='relative mt-2 h-px bg-paper/25'>
                            {/* where the speakers hang */}
                            {speakers.map((sp) => (
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
