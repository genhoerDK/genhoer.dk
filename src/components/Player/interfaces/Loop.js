'use client';

/**
 * Interface: loop — a work that runs under the surface (src/audio/Loop.js), with one button that
 * brings it up, as the button at the installation did.
 *
 * The photo lies under water: blurred and dim. Pressing the button clears it and the sound; as
 * long as the button is held it stays up, and when it is let go the seconds at the surface count
 * down in the button and in the ring around it, and then photo and sound sink back. Every press
 * starts over. Space or Enter press the button too.
 *
 *   player.layers   { below, above }  the two versions of the loop
 *   player.surface  { up, hold, down } seconds
 */

import { useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import { useEngineState } from '@/components/Player/interfaces/useEngineState';
import { keyIsTaken } from '@/components/Player/interfaces/keys';
import PlayerShell, { Controls, Status } from '@/components/Player/PlayerShell';
import StartButton from '@/components/Player/interfaces/StartButton';

const RADIUS = 47;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function LoopPlayer() {
    const { currentTrack, engine, isPlaying, play } = useAudio();
    const state = useEngineState(engine);
    const { surface } = currentTrack.player;
    const running = isPlaying && state?.running;
    const phase = running ? state.phase : 'below';

    /** Space or Enter hold the button down */
    useEffect(() => {
        if (!running) return;
        const isPress = (e) => (e.key === ' ' || e.key === 'Enter') && !keyIsTaken(e);
        const onDown = (e) => { if (isPress(e) && !e.repeat) { e.preventDefault(); engine.down(); } };
        const onUp = (e) => { if (isPress(e)) engine.up(); };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, [running, engine]);

    /** Pointer down holds, pointer up lets go — also when the finger slides off */
    const onPointerDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); engine.down(); };
    const onPointerUp = () => engine.up();

    // The water: the photo clears as fast as the sound does, and sinks back as slowly
    const filter = phase === 'above' ? '' : 'blur(14px) brightness(0.55)';
    const filterTransition = phase === 'above' ? `filter ${surface.up}s ease-out` : phase === 'sinking' ? `filter ${surface.down}s ease-in` : 'filter 0.5s';

    return (
        <PlayerShell track={currentTrack} filter={filter} filterTransition={filterTransition} smoke={0}>
            {!isPlaying ? (
                <StartButton onClick={() => play()} />
            ) : (
                <Controls title={currentTrack.title} hint={running ? 'Tryk — eller hold nede' : undefined} align='center' className='flex flex-col items-center'>
                    {state?.error ? (
                        <Status>Lydfilerne kunne ikke hentes</Status>
                    ) : !running ? (
                        <Status pulse>Henter lyd …</Status>
                    ) : (
                        <button
                            onPointerDown={onPointerDown}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onContextMenu={(e) => e.preventDefault()}
                            aria-label='Op til overfladen'
                            aria-live='polite'
                            className='relative flex items-center justify-center size-28 rounded-full cursor-pointer touch-none select-none group'
                        >
                            {/* The ring: the time left at the surface, then the sinking */}
                            <svg viewBox='0 0 100 100' className={`absolute inset-0 size-full -rotate-90 transition-opacity ${phase === 'sinking' ? 'opacity-40' : 'opacity-100'}`} aria-hidden='true'>
                                <circle cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeOpacity='0.2' strokeWidth='1.5' />
                                <circle
                                    cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'
                                    strokeDasharray={CIRCUMFERENCE}
                                    strokeDashoffset={CIRCUMFERENCE * (1 - (phase === 'below' ? 0 : state.left))}
                                />
                            </svg>
                            <span className={`flex items-center justify-center size-20 rounded-full font-extralight tabular-nums text-3xl transition-colors duration-300 ${phase === 'below' ? 'bg-paper text-ink md:group-hover:bg-muted' : 'bg-paper/15 text-paper'}`}>
                                {phase === 'above' ? state.secondsLeft : ''}
                            </span>
                        </button>
                    )}
                </Controls>
            )}
        </PlayerShell>
    );
}
