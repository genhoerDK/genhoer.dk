'use client';

/**
 * Interface: loop — a work that runs under the surface (src/player/audio/Loop.js), with one button that
 * brings it up, as the button at the installation did.
 *
 * The photo lies under water: blurred and dim. Pressing the button clears it and the sound; as
 * long as the button is held it stays up, and when it is let go the time at the surface runs
 * down in the ring around the button — no numbers — and then photo and sound sink back. Every press
 * starts over. Space or Enter press the button too.
 *
 *   player.layers   { below, above }  the two versions of the loop
 *   player.surface  { up, hold, down } seconds
 */

import { useEffect } from 'react';
import { useAudio } from '@/player/AudioContext';
import { useEngineState } from '@/player/frame/useEngineState';
import { keyIsTaken } from '@/player/frame/keys';
import PlayerShell, { Controls, Status } from '@/player/frame/PlayerShell';
import StartButton from '@/player/frame/StartButton';
import SoundButton from '@/player/frame/SoundButton';


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
                <Controls title={currentTrack.title} align='center' className='flex flex-col items-center'>
                    {state?.error ? (
                        <Status>Lydfilerne kunne ikke hentes</Status>
                    ) : !running ? (
                        <Status pulse>Henter lyd …</Status>
                    ) : (
                        <SoundButton
                            size='lg'
                            on={phase !== 'below'}
                            ring={phase === 'below' ? 0 : state.left}
                            onPointerDown={onPointerDown}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            ariaLabel='Op til overfladen'
                        />
                    )}
                </Controls>
            )}
        </PlayerShell>
    );
}
