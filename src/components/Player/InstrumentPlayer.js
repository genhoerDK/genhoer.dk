'use client';

/**
 * Interface: buttons — a work played with buttons (src/audio/Instrument.js), shown as a 3D scene
 * (InstrumentScene.js) that draws its own photo behind the buttons. Press and hold like the
 * physical buttons; keys 1–5 work too.
 */

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/context/AudioContext';
import { useEngineState } from '@/components/Player/interfaces/useEngineState';
import PlayerShell, { Controls, Status } from '@/components/Player/PlayerShell';
import StartButton from '@/components/Player/interfaces/StartButton';

/** three.js is only loaded when an instrument is opened */
const InstrumentScene = dynamic(() => import('@/components/Player/InstrumentScene'), { ssr: false });

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
        <PlayerShell track={currentTrack} backdrop={false} hint='Spil på troldens lur: tryk på knapperne, og hold dem nede for lange toner. Lyt efter sagnene undervejs.'>
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
            ) : state?.error ? (
                <Controls className='flex justify-center'><Status>Lydfilerne kunne ikke hentes</Status></Controls>
            ) : !state?.loaded ? (
                <Controls className='flex justify-center'><Status pulse>Henter lyd …</Status></Controls>
            ) : null}
        </PlayerShell>
    );
}
