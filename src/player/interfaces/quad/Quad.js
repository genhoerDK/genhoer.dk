'use client';

/**
 * Interface: quad — a work made for four speakers around the listener (src/player/audio/Quad.js), shown
 * as its work's 3D scene (src/player/vaerker/<slug>/, Kanon i G3: the gun emplacement seen from above), the sound travelling in from
 * the speakers towards you. Move the pointer to turn: with headphones each speaker stays where it
 * hangs. ←/→ turn too. Scroll, pinch or ↑/↓ take you down to stand at eye height in the middle, and
 * back up. Space pauses and plays. No text tells you so: the work is found by moving in it.
 *
 *   player.speakers  [{ label, angle, file, channel? }]  angle: degrees clockwise from straight ahead
 *   player.reverb    0–1, the room's echo on top
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scenes } from '@/player/vaerker/scenes';
import { useAudio } from '@/player/AudioContext';
import { useEngineState } from '@/player/frame/useEngineState';
import { keyIsTaken } from '@/player/frame/keys';
import PlayerShell, { Controls, Status } from '@/player/frame/PlayerShell';
import StartButton from '@/player/frame/StartButton';
import Label from '@/components/UI/Label';

/** three.js is only loaded when the work is opened */

export default function QuadPlayer() {
    const { currentTrack, engine, isPlaying, play, pause } = useAudio();
    const state = useEngineState(engine, 4);
    const { speakers } = currentTrack.player;
    const Scene = scenes[currentTrack.slug];   // the work's own 3D scene (src/player/vaerker/<slug>/)
    const angles = useMemo(() => speakers.map((s) => s.angle), [speakers]);
    const ready = isPlaying && state?.loaded;

    /* ---------- TURNING ON TOP OF THE POINTER: the keyboard ---------- */

    const turnRef = useRef(0);
    const [heading, setHeading] = useState(0);
    const onTurn = useCallback((yaw) => setHeading(Math.round((((yaw * 180) / Math.PI) % 360 + 360) % 360)), []);

    /* ---------- GOING DOWN INTO IT: 0 = above, 1 = standing in the middle (scroll, pinch, ↑/↓) ---------- */

    const zoomRef = useRef(0);

    useEffect(() => {
        const onKey = (e) => {
            if (keyIsTaken(e)) return;
            if (e.key === 'ArrowLeft') turnRef.current -= Math.PI / 12;
            if (e.key === 'ArrowRight') turnRef.current += Math.PI / 12;
            if (e.key === 'ArrowUp') { e.preventDefault(); zoomRef.current = Math.min(1, zoomRef.current + 0.25); }
            if (e.key === 'ArrowDown') { e.preventDefault(); zoomRef.current = Math.max(0, zoomRef.current - 0.25); }
            if (e.key === ' ' && !e.repeat && engine) { e.preventDefault(); isPlaying ? pause() : play(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [engine, isPlaying, pause, play]);

    return (
        <PlayerShell track={currentTrack} backdrop={false} model>
            {engine && Scene && (
                <Scene engine={engine} angles={angles} turnRef={turnRef} onTurn={onTurn} zoomRef={zoomRef} />
            )}

            {!isPlaying && !engine ? (
                <StartButton onClick={() => play()} label='Træd ind' />
            ) : (
                <Controls title={currentTrack.title}>
                    {state?.error ? (
                        <Status>Lydfilerne kunne ikke hentes</Status>
                    ) : !state?.loaded ? (
                        <Status pulse>Henter lyd …</Status>
                    ) : (
                        <div className='flex items-center gap-4'>
                            <span role='slider' aria-label='Hvilken vej du vender' aria-valuenow={heading} aria-valuemin={0} aria-valuemax={359} className='sr-only'>{heading}°</span>
                            <Label size='lg' className='text-muted'>{isPlaying ? '' : 'Pause'}</Label>
                        </div>
                    )}
                </Controls>
            )}
        </PlayerShell>
    );
}
