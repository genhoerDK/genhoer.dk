'use client';

/**
 * Interface: street — a work that stood in a street, played as you walk it (Kirkestræde).
 *
 * The street lies behind in 3D at eye level (StreetScene.js, three.js, loaded when the work is
 * opened), in the 3D style (STIL.md): built from OpenStreetMap, from one end to the other, ending in mist both ways. Scrolling
 * walks you up and down it. The work plays as one file, with its chapters, on the timeline at the
 * bottom; over the timeline, where you are in the street. The speakers stood round one house: the
 * further you walk from them, the quieter the work (where the phone lets the page set it).
 *
 *   player.street   A street named in src/player/vaerker/streets.js
 *   player.ends     The names at its two ends, as they are walked: [from, to]
 *   player.reach    Metres from the speakers over which the sound falls to its quietest (default 70)
 *   player.quietest 0–1: how quiet it gets furthest away (default 0.3)
 */

import { useCallback, useEffect, useState } from 'react';
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
    const { street: name, ends = [], reach = 70, quietest = 0.3 } = currentTrack.player;
    const data = streets[name];
    const [at, setAt] = useState({ s: data.walk[0], f: 0 });

    // The speakers' stretch along the street, 0–1 of the walk
    const span = data.walk[1] - data.walk[0];
    const zone = [(data.at20 - 15 - data.walk[0]) / span, (data.at20 + 15 - data.walk[0]) / span];

    /** Quieter the further from the speakers */
    const onMove = useCallback((where) => {
        setAt(where);
        const away = Math.max(0, Math.abs(where.s - data.at20) - 15);
        setVolume(quietest + (1 - quietest) * Math.exp(-away / (reach / 2.5)));
    }, [data.at20, reach, quietest, setVolume]);
    useEffect(() => () => setVolume(1), [setVolume]);

    return (
        <PlayerShell track={currentTrack} backdrop={false} model>
            {/* ---------- THE STREET ---------- */}
            <StreetScene data={data} sounding={isPlaying} onMove={onMove} />

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
                            {/* where the speakers stood */}
                            <span className='absolute -top-px h-[3px] bg-paper/50' style={{ left: `${zone[0] * 100}%`, width: `${(zone[1] - zone[0]) * 100}%` }} />
                            <span className='absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper' style={{ left: `${Math.min(1, Math.max(0, at.f)) * 100}%` }} />
                        </div>
                    </div>
                }
            />
        </PlayerShell>
    );
}
