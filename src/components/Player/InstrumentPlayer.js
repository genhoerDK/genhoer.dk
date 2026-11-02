'use client';

/**
 * Player for sound works played with buttons (see src/audio/Instrument.js), shown as a
 * 3D listening stand (ListeningStand.js). Press and hold like the physical buttons.
 * Keys 1–5 work too.
 *
 * The readout at the bottom shows what the layers are doing — for testing, remove when done.
 */

import { useState, useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import dynamic from 'next/dynamic';
import { PlayCircleIcon } from '@heroicons/react/20/solid';

/** three.js is only loaded when an instrument is opened */
const ListeningStand = dynamic(() => import('@/components/Player/ListeningStand'), { ssr: false });

export default function InstrumentPlayer() {
    const { currentTrack, instrument, isPlaying, play } = useAudio();
    const [state, setState] = useState(null);

    /** Read the instrument's state every frame */
    useEffect(() => {
        if (!instrument) return;
        let frame;
        const read = () => {
            setState(instrument.getState());
            frame = requestAnimationFrame(read);
        };
        read();
        return () => cancelAnimationFrame(frame);
    }, [instrument]);

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
        <div className='relative flex flex-col justify-center items-center size-full min-h-160 h-svh'>
            <h2 className='absolute z-10 left-gutter top-12 leading-none font-extralight text-lg md:text-xl'>{currentTrack?.title}</h2>

            {instrument && (
                <ListeningStand
                    instrument={instrument}
                    ready={ready}
                    title={currentTrack?.title}
                    paragraphs={currentTrack?.description}
                    cover={currentTrack?.coverImageLandscape}
                    coverFocus={instrument.config.coverFocus}
                />
            )}

            {!isPlaying ? (
                <button className="absolute inset-0 flex items-center justify-center cursor-pointer z-10" onClick={() => play()}>
                    <div className="absolute size-80 bg-paper blur-xl opacity-80 rounded-full"></div>
                    <PlayCircleIcon className="size-24 text-ink z-10" />
                </button>
            ) : state?.error ? (
                <p className='absolute z-10 bottom-32 text-xs uppercase'>Lydfilerne kunne ikke hentes</p>
            ) : !state?.loaded ? (
                <p className='absolute z-10 bottom-32 text-xs uppercase animate-pulse'>Henter lyd …</p>
            ) : null}

            {state?.loaded && <Readout state={state} config={instrument.config} />}
        </div>
    );
}

/** What the layers are doing — for testing */
function Readout({ state, config }) {
    const s = (sec) => `${Math.ceil(sec)} s`;
    const rows = [
        ['Musik', state.music, !Number.isFinite(state.musicLeft) ? 'kører' : state.musicLeft > 0 ? `fader ud om ${s(state.musicLeft)}` : 'stille'],
        ['Rytme', state.rhythm, state.rhythmOpen ? 'åben' : `åbner efter ${s(Math.max(0, config.timing.rhythmAfter - state.musicOnFor))} musik`],
        ['Fortælling', state.storyPlaying ? 1 : 0,
            state.storyPlaying ? `spiller ${state.storyIndex + 1}/${config.stories.length}`
            : state.storyCounting ? `nr. ${state.storyIndex + 1} om ${s(state.storyLeft)}` : 'venter på tryk'],
    ];

    return (
        <dl className='absolute z-10 left-gutter bottom-28 md:bottom-8 grid grid-cols-[auto_4rem_auto] gap-x-3 gap-y-1 items-center text-[0.625rem] uppercase text-hard'>
            {rows.map(([label, level, text]) => (
                <div key={label} className='contents'>
                    <dt>{label}</dt>
                    <dd className='h-1 bg-soft'><div className='h-full bg-ink' style={{ width: `${level * 100}%` }} /></dd>
                    <dd>{text}</dd>
                </div>
            ))}
        </dl>
    );
}
