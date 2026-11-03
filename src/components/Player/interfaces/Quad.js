'use client';

/**
 * Interface: quad — a work made for four speakers around the listener (src/audio/Quad.js).
 *
 * The room, seen from above: the speakers stand where they stood, each one glowing as loud as
 * it is, and you in the middle, facing up. Drag (or ←/→) to turn: the room turns around you and
 * the sound with it — with headphones each speaker stays where it stands. On a phone the compass
 * can turn it instead. Space pauses and plays.
 *
 *   player.speakers  [{ label, angle, file, channel? }]  angle: degrees clockwise from straight ahead
 *   player.reverb    0–1, the room's echo on top
 */

import { useEffect, useRef, useState } from 'react';
import { useAudio } from '@/context/AudioContext';
import { useEngineState } from '@/components/Player/interfaces/useEngineState';
import PlayerShell, { Controls, Status } from '@/components/Player/PlayerShell';
import StartButton from '@/components/Player/interfaces/StartButton';
import Label from '@/components/UI/Label';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

const RING = 40;   // the speakers' distance from the middle, in the drawing

export default function QuadPlayer() {
    const { currentTrack, engine, isPlaying, play, pause } = useAudio();
    const state = useEngineState(engine);
    const { speakers } = currentTrack.player;
    const running = isPlaying && state?.running;

    /* ---------- TURNING ---------- */

    const [yaw, setYaw] = useState(0);   // radians, clockwise
    const yawRef = useRef(0);
    const turnTo = (value) => {
        yawRef.current = value;
        setYaw(value);
        engine?.setYaw(value);
    };
    const turnBy = (delta) => turnTo(yawRef.current + delta);

    const drag = useRef(null);
    const onPointerDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = e.clientX; };
    const onPointerMove = (e) => {
        if (drag.current == null) return;
        turnBy((e.clientX - drag.current) * 0.01);
        drag.current = e.clientX;
    };
    const onPointerUp = () => { drag.current = null; };

    /** The phone's compass turns the listener (iOS asks first) */
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
            turnTo(((heading - first) * Math.PI) / 180);
        };
        window.addEventListener('deviceorientation', onOrientation);
        return () => window.removeEventListener('deviceorientation', onOrientation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compass, engine]);

    /** ←/→ turn, space pauses and plays */
    useEffect(() => {
        const onKey = (e) => {
            if (keyIsTaken(e)) return;
            if (e.key === 'ArrowLeft') turnBy(-Math.PI / 12);
            if (e.key === 'ArrowRight') turnBy(Math.PI / 12);
            if (e.key === ' ' && !e.repeat && engine) { e.preventDefault(); isPlaying ? pause() : play(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, isPlaying]);

    const degrees = (-yaw * 180) / Math.PI;   // the room turns the other way: you turn
    const levels = state?.levels ?? [];

    return (
        <PlayerShell track={currentTrack} smoke={0.5} hint='Lyden står i fire højttalere omkring dig. Tag hovedtelefoner på, og drej dig for at lytte rundt i rummet.'>
            {!isPlaying && !engine ? (
                <StartButton onClick={() => play()} label='Tryk, og træd ind' />
            ) : state?.error ? (
                <Controls className='flex justify-center'><Status>Lydfilerne kunne ikke hentes</Status></Controls>
            ) : !state?.loaded ? (
                <Controls className='flex justify-center'><Status pulse>Henter lyd …</Status></Controls>
            ) : (
                <Controls className='flex flex-col items-center gap-4'>
                    {/* ---------- THE ROOM ---------- */}
                    <div
                        role='slider'
                        tabIndex={0}
                        aria-label='Drej dig i rummet'
                        aria-valuenow={Math.round((((yaw * 180) / Math.PI) % 360 + 360) % 360)}
                        aria-valuemin={0}
                        aria-valuemax={359}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        className='size-64 md:size-80 touch-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-1 focus-visible:ring-paper/50 rounded-full'
                    >
                        <svg viewBox='-60 -60 120 120' className='size-full overflow-visible' aria-hidden='true'>
                            <g style={{ transform: `rotate(${degrees}deg)`, transition: compass ? 'none' : 'transform 80ms linear' }}>
                                {/* The room */}
                                <rect x='-50' y='-50' width='100' height='100' rx='3' fill='none' stroke='currentColor' strokeOpacity='0.25' strokeWidth='0.6' />
                                <circle r={RING} fill='none' stroke='currentColor' strokeOpacity='0.12' strokeWidth='0.4' strokeDasharray='1 2' />
                                {/* The speakers */}
                                {speakers.map((speaker, i) => {
                                    const a = (speaker.angle * Math.PI) / 180;
                                    const x = Math.sin(a) * RING, y = -Math.cos(a) * RING;
                                    const level = levels[i] ?? 0;
                                    return (
                                        <g key={speaker.label} transform={`translate(${x} ${y})`}>
                                            <circle r={5 + level * 9} fill='currentColor' fillOpacity={0.08 + level * 0.25} />
                                            <circle r='2.4' fill='currentColor' fillOpacity={0.5 + level * 0.5} />
                                            <text y='9' textAnchor='middle' fontSize='3.6' fill='currentColor' fillOpacity='0.6' style={{ transform: `rotate(${-degrees}deg)`, transformOrigin: '0 0', transformBox: 'fill-box' }} className='uppercase'>
                                                {speaker.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                            {/* You, facing up */}
                            <circle r='3' fill='currentColor' />
                            <path d='M -2.6 -3.5 L 0 -9 L 2.6 -3.5 Z' fill='currentColor' />
                        </svg>
                    </div>

                    <div className='flex items-center gap-4'>
                        <Label size='lg' className='text-muted'>{running ? 'Træk for at dreje dig' : 'Pause'}</Label>
                        {canUseCompass && (
                            <button onClick={toggleCompass} aria-pressed={compass} className={`px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${compass ? 'bg-paper text-ink border-paper' : 'border-paper/40 text-muted'}`}>
                                <Label size='lg'>{compass ? 'Kompas til' : 'Brug kompasset'}</Label>
                            </button>
                        )}
                    </div>
                </Controls>
            )}
        </PlayerShell>
    );
}
