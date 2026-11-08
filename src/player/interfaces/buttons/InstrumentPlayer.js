'use client';

/**
 * Interface: buttons — a work played with buttons (src/player/audio/Instrument.js): a row of the
 * works' button (frame/SoundButton.js), one per sound, over the work's photo with depth. Press and
 * hold like the physical buttons — several at once on a touch screen; the ring runs with the
 * button's sound. Keys 1–5 work too.
 */

import { useEffect, useState } from 'react';
import { useAudio } from '@/player/AudioContext';
import { useEngineState } from '@/player/frame/useEngineState';
import PlayerShell, { Controls, Status } from '@/player/frame/PlayerShell';
import StartButton from '@/player/frame/StartButton';
import SoundButton from '@/player/frame/SoundButton';

export default function InstrumentPlayer() {
    const { currentTrack, engine: instrument, isPlaying, play } = useAudio();
    const state = useEngineState(instrument, 60);
    const [held, setHeld] = useState([]);   // the buttons held down right now

    /** Keys 1–5 press and release the buttons */
    useEffect(() => {
        if (!instrument) return;
        const index = (e) => {
            const i = Number(e.key) - 1;
            return Number.isInteger(i) && i >= 0 && i < instrument.voices.length ? i : -1;
        };
        const down = (e) => { const i = index(e); if (i >= 0 && !e.repeat) { instrument.press(i); setHeld((h) => [...h, i]); } };
        const up = (e) => { const i = index(e); if (i >= 0) { instrument.release(i); setHeld((h) => h.filter((j) => j !== i)); } };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [instrument]);

    const ready = isPlaying && state?.loaded;
    const samples = instrument?.config.samples ?? [];

    /** Pointer down holds, pointer up lets go — also when the finger slides off */
    const hold = (i) => (e) => { e.currentTarget.setPointerCapture(e.pointerId); instrument.press(i); setHeld((h) => [...h, i]); };
    const letGo = (i) => () => { instrument.release(i); setHeld((h) => h.filter((j) => j !== i)); };

    return (
        <PlayerShell track={currentTrack} depth={instrument?.config.coverDepth} focus={instrument?.config.coverFocus}>
            {!isPlaying ? (
                <StartButton onClick={() => play()} />
            ) : (
                <Controls title={currentTrack.title} hint={state?.error ? undefined : 'Tryk på knapperne — hold for lange toner'} align='center' className='flex flex-col items-center'>
                    {state?.error ? (
                        <Status>Lydfilerne kunne ikke hentes</Status>
                    ) : !ready ? (
                        <Status pulse>Henter lyd …</Status>
                    ) : (
                        <div className='flex justify-center gap-2 sm:gap-4 md:gap-6'>
                            {samples.map((sample, i) => (
                                <SoundButton
                                    key={sample.name}
                                    size='md'
                                    on={(state.voices[i] ?? 'idle') !== 'idle'}
                                    held={held.includes(i)}
                                    ring={state.voicesLeft?.[i] ?? 0}
                                    onPointerDown={hold(i)}
                                    onPointerUp={letGo(i)}
                                    onPointerCancel={letGo(i)}
                                    ariaLabel={`Tone ${i + 1}`}
                                >
                                    {i + 1}
                                </SoundButton>
                            ))}
                        </div>
                    )}
                </Controls>
            )}
        </PlayerShell>
    );
}
