'use client';

/**
 * Interface: loop — a work that runs under the surface (src/audio/Loop.js), with one button that
 * brings it up for a while, as the button at the installation did.
 *
 * The photo lies under water: blurred and dim. A press clears it and the sound in a tenth of a
 * second; a ring around the button drains as the seconds at the surface pass, then photo and
 * sound sink back over a few seconds. Presses while up are ignored, like the installation.
 * Space or Enter press the button.
 *
 *   player.layers   { below, above }  the two versions of the loop
 *   player.surface  { up, hold, down } seconds
 */

import { useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import { useEngineState } from '@/components/Player/interfaces/useEngineState';
import PlayerShell, { Controls, Status } from '@/components/Player/PlayerShell';
import StartButton from '@/components/Player/interfaces/StartButton';
import Label from '@/components/UI/Label';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

const RADIUS = 47;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function LoopPlayer() {
    const { currentTrack, engine, isPlaying, play } = useAudio();
    const state = useEngineState(engine);
    const { surface } = currentTrack.player;
    const running = isPlaying && state?.running;
    const phase = running ? state.phase : 'below';

    /** Space or Enter press the button */
    useEffect(() => {
        if (!running) return;
        const onKey = (e) => {
            if (e.repeat || keyIsTaken(e)) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); engine.press(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [running, engine]);

    // The water: the photo clears as fast as the sound does, and sinks back as slowly
    const filter = phase === 'above' ? '' : 'blur(14px) brightness(0.55)';
    const filterTransition = phase === 'above' ? `filter ${surface.up}s ease-out` : phase === 'sinking' ? `filter ${surface.down}s ease-in` : 'filter 0.5s';

    const words = {
        below: 'Tryk, og kom op til overfladen',
        above: `Over overfladen · ${state?.secondsLeft ?? 0} s`,
        sinking: 'Synker igen …',
    };

    return (
        <PlayerShell track={currentTrack} filter={filter} filterTransition={filterTransition} smoke={0} hint='Lyden løber under overfladen. Tryk på knappen, og kom op i ti sekunder.'>
            {!isPlaying ? (
                <StartButton onClick={() => play()} />
            ) : state?.error ? (
                <Controls className='flex justify-center'><Status>Lydfilerne kunne ikke hentes</Status></Controls>
            ) : !running ? (
                <Controls className='flex justify-center'><Status pulse>Henter lyd …</Status></Controls>
            ) : (
                <Controls className='flex flex-col items-center gap-5'>
                    <button
                        onClick={() => engine.press()}
                        disabled={phase !== 'below'}
                        aria-label='Op til overfladen'
                        className='relative flex items-center justify-center size-28 rounded-full cursor-pointer disabled:cursor-default group'
                    >
                        {/* The ring: the time left at the surface, and then the sinking */}
                        <svg viewBox='0 0 100 100' className={`absolute inset-0 size-full -rotate-90 transition-opacity ${phase === 'sinking' ? 'opacity-40' : 'opacity-100'}`} aria-hidden='true'>
                            <circle cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeOpacity='0.2' strokeWidth='1.5' />
                            <circle
                                cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={CIRCUMFERENCE * (1 - (phase === 'below' ? 0 : state.left))}
                            />
                        </svg>
                        <span className={`flex items-center justify-center size-20 rounded-full transition-colors duration-300 ${phase === 'below' ? 'bg-paper text-ink md:group-hover:bg-muted' : 'bg-paper/15 text-paper'}`}>
                            <ArrowUpIcon className='size-8' />
                        </span>
                    </button>
                    <div aria-live='polite'><Label size='lg' className='text-muted tabular-nums'>{words[phase]}</Label></div>
                </Controls>
            )}
        </PlayerShell>
    );
}
