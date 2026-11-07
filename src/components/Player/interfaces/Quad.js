'use client';

/**
 * Interface: quad — a work made for four speakers around the listener (src/audio/Quad.js), shown
 * as a 3D scene (QuadScene.js): the gun emplacement seen from above, the sound travelling in from
 * the speakers towards you. Move the pointer to turn: with headphones each speaker stays where it
 * hangs. ←/→ turn too, and on a phone the compass can turn it. Scroll, pinch, ↑/↓ or the button
 * take you down to stand at eye height in the middle, and back up. Space pauses and plays.
 *
 *   player.textured  true = the concrete texture on the emplacement (default: plain grey)
 *   player.look      'realistic' (default) or 'stylised': a pale, simple, modern indie-game look
 *   player.image     Photo behind
 *   player.speakers  [{ label, angle, file, channel? }]  angle: degrees clockwise from straight ahead
 *   player.reverb    0–1, the room's echo on top
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/context/AudioContext';
import { useEngineState } from '@/components/Player/interfaces/useEngineState';
import { keyIsTaken } from '@/components/Player/interfaces/keys';
import { depthMapFor } from '@/components/Player/scene/depth';
import PlayerShell, { Controls, Status } from '@/components/Player/PlayerShell';
import StartButton from '@/components/Player/interfaces/StartButton';
import Label from '@/components/UI/Label';

/** three.js is only loaded when the work is opened */
const QuadScene = dynamic(() => import('@/components/Player/QuadScene'), { ssr: false });

export default function QuadPlayer() {
    const { currentTrack, engine, isPlaying, play, pause } = useAudio();
    const state = useEngineState(engine, 4);
    const { speakers, textured, image, look } = currentTrack.player;
    const angles = useMemo(() => speakers.map((s) => s.angle), [speakers]);
    const photo = image ?? currentTrack.coverImageLandscape;
    const ready = isPlaying && state?.loaded;

    /* ---------- TURNING ON TOP OF THE POINTER: the keyboard and the compass ---------- */

    const turnRef = useRef(0);
    const [heading, setHeading] = useState(0);
    const onTurn = useCallback((yaw) => setHeading(Math.round((((yaw * 180) / Math.PI) % 360 + 360) % 360)), []);

    /* ---------- GOING DOWN INTO IT: 0 = above, 1 = standing in the middle ---------- */

    const zoomRef = useRef(0);
    const [inside, setInside] = useState(false);
    const onZoom = useCallback((value) => setInside(value), []);

    const [compass, setCompass] = useState(false);
    const canUseCompass = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && 'ontouchstart' in window;
    const toggleCompass = async () => {
        if (compass) return setCompass(false);
        try {
            if (typeof DeviceOrientationEvent.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
            setCompass(true);
        } catch { /* no compass */ }
    };
    useEffect(() => {
        if (!compass) return;
        let first = null;
        const onOrientation = (e) => {
            const heading = e.webkitCompassHeading ?? (e.alpha == null ? null : 360 - e.alpha);
            if (heading == null) return;
            if (first == null) first = heading;   // where you face when you switch it on is straight ahead
            turnRef.current = ((heading - first) * Math.PI) / 180;
        };
        window.addEventListener('deviceorientation', onOrientation);
        return () => window.removeEventListener('deviceorientation', onOrientation);
    }, [compass]);

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

    const touch = typeof window !== 'undefined' && 'ontouchstart' in window;

    return (
        <PlayerShell track={currentTrack} backdrop={false}>
            {engine && (
                <QuadScene engine={engine} textured={textured === true} angles={angles} cover={photo} coverDepth={depthMapFor(photo)} turnRef={turnRef} onTurn={onTurn} zoomRef={zoomRef} onZoom={onZoom} look={look} />
            )}

            {!isPlaying && !engine ? (
                <StartButton onClick={() => play()} label='Tryk, og træd ind' />
            ) : (
                <Controls title={currentTrack.title} hint={ready ? (touch ? 'Træk for at dreje dig, spred to fingre for at gå ned i stillingen — bedst med hovedtelefoner' : 'Bevæg musen for at dreje dig, rul for at gå ned i stillingen — bedst med hovedtelefoner') : undefined}>
                    {state?.error ? (
                        <Status>Lydfilerne kunne ikke hentes</Status>
                    ) : !state?.loaded ? (
                        <Status pulse>Henter lyd …</Status>
                    ) : (
                        <div className='flex items-center gap-4'>
                            <span role='slider' aria-label='Hvilken vej du vender' aria-valuenow={heading} aria-valuemin={0} aria-valuemax={359} className='sr-only'>{heading}°</span>
                            <Label size='lg' className='text-muted'>{isPlaying ? '' : 'Pause'}</Label>
                            <button onClick={() => { zoomRef.current = inside ? 0 : 1; }} aria-pressed={inside} className={`px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${inside ? 'bg-paper text-ink border-paper' : 'border-paper/40 text-muted'}`}>
                                <Label size='lg'>{inside ? 'Se oppefra' : 'Stå i midten'}</Label>
                            </button>
                            {canUseCompass && (
                                <button onClick={toggleCompass} aria-pressed={compass} className={`px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${compass ? 'bg-paper text-ink border-paper' : 'border-paper/40 text-muted'}`}>
                                    <Label size='lg'>{compass ? 'Kompas til' : 'Brug kompasset'}</Label>
                                </button>
                            )}
                        </div>
                    )}
                </Controls>
            )}
        </PlayerShell>
    );
}
