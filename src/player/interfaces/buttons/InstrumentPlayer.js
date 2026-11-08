'use client';

/**
 * Interface: buttons — a work played with buttons (src/player/audio/Instrument.js), shown as a 3D scene
 * (InstrumentScene.js) that draws its own photo behind the buttons. Press and hold like the
 * physical buttons; keys 1–5 work too.
 */

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/player/AudioContext';
import { useEngineState } from '@/player/frame/useEngineState';
import PlayerShell, { Controls, Status } from '@/player/frame/PlayerShell';
import StartButton from '@/player/frame/StartButton';

/** three.js is only loaded when an instrument is opened */
const InstrumentScene = dynamic(() => import('@/player/interfaces/buttons/InstrumentScene'), { ssr: false });

export default function InstrumentPlayer() {
    const { currentTrack, engine: instrument, isPlaying, play } = useAudio();
    const state = useEngineState(instrument, 60);

    /** Keys 1–5 press and release the buttons */
    useEffect(() => {
        if (!instrument) return;
        const index = (e) => {
            const i = Number(e.key) - 1;
            return Number.isInteger(i) && i >= 0 && i < instrument.voices.length ? i : -1;
        };
        const down = (e) => { const i = index(e); if (i >= 0 && !e.repeat) instrument.press(i); };
        const up = (e) => { const i = index(e); if (i >= 0) instrument.release(i); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [instrument]);

    const ready = isPlaying && state?.loaded;

    return (
        <PlayerShell track={currentTrack} backdrop={false}>
            {instrument && (
                <InstrumentScene
                    instrument={instrument}
                    ready={ready}
                    cover={currentTrack.coverImageLandscape}
                    coverDepth={instrument.config.coverDepth}
                    coverFocus={instrument.config.coverFocus}
                />
            )}

            {!isPlaying ? (
                <StartButton onClick={() => play()} />
            ) : (
                <Controls title={currentTrack.title} hint={state?.error ? undefined : 'Tryk på knapperne — hold for lange toner'}>
                    {state?.error ? <Status>Lydfilerne kunne ikke hentes</Status> : !state?.loaded ? <Status pulse>Henter lyd …</Status> : null}
                </Controls>
            )}
        </PlayerShell>
    );
}
