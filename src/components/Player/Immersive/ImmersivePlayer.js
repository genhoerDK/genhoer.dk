'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon, MusicalNoteIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Button from '@/components/UI/Button';
import Label from '@/components/UI/Label';
import { createStage } from './stage';
import { useAudioEnvelope } from './useAudioEnvelope';
import { interfaces, interfaceFor, interfacesOfKind, kindOf } from './interfaces';
import Timeline from './Timeline';
import ButtonPad from './ButtonPad';
import LayerLegend from './LayerLegend';
import WorksDrawer from './WorksDrawer';

/**
 * Full-page, three.js based player. The 3D scene is chosen per work
 * (see interfaces/index.js); the HTML layer on top follows the rest of the site:
 * title and current chapter (or the layers of an interactive work) at the top,
 * transport and timeline — or the work's buttons — at the bottom.
 */
export default function ImmersivePlayer() {
    const audio = useAudio();
    const { currentTrack, isPlaying, play, pause, seek, getTime, duration, engine } = audio;
    const kind = kindOf(currentTrack);
    const interactive = kind === 'interactive';
    const envelope = useAudioEnvelope(interactive ? null : currentTrack);

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const [override, setOverride] = useState(null); // test switch between interfaces
    const [worksOpen, setWorksOpen] = useState(false);
    const [hint, setHint] = useState(true);

    const segments = currentTrack?.segments ?? [];
    const type = interfaceFor(currentTrack, override);

    /* The stage reads the latest values through a ref, so React doesn't re-render per frame */
    const live = useRef({});
    useLayoutEffect(() => { live.current = { audio, envelope, segments, engine }; });

    useEffect(() => {
        const getState = () => {
            const { audio, envelope, segments, engine } = live.current;
            const d = audio.duration || 0;
            const t = audio.getTime();
            return {
                currentTime: t,
                duration: d,
                progress: d ? Math.min(t / d, 1) : 0,
                isPlaying: audio.isPlaying,
                envelope,
                segments,
                chapterIndex: chapterAt(segments, t),
                engine,
                engineState: engine?.snapshot() ?? null,
            };
        };
        const actions = {
            play: () => live.current.audio.play(),
            pause: () => live.current.audio.pause(),
            seek: (s) => live.current.audio.seek(s),
            seekFraction: (f) => live.current.audio.seek(f * (live.current.audio.duration || 0)),
            press: (i) => live.current.engine?.press(i),
            release: (i) => live.current.engine?.release(i),
        };
        const stage = createStage(containerRef.current, { getState, actions });
        stageRef.current = stage;
        return () => { stage.dispose(); stageRef.current = null; };
    }, []);

    // Remount when the work, its interface or its sound engine changes
    useEffect(() => {
        stageRef.current?.mount(interfaces[type].factory, currentTrack?.player ?? {});
    }, [type, currentTrack, engine]);

    useEffect(() => {
        setHint(true);
        const id = setTimeout(() => setHint(false), 7000);
        return () => clearTimeout(id);
    }, [currentTrack]);

    /* Keys: space plays/pauses, arrows step chapters, 1–9 hold the buttons of an interactive work */
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.closest?.('input, textarea')) return;
            const { audio, segments, engine } = live.current;
            const digit = /^Digit([1-9])$/.exec(e.code);
            if (digit && engine) {
                if (!e.repeat) engine.press(Number(digit[1]) - 1);
                return;
            }
            if (e.target.closest?.('button')) return;
            const index = chapterAt(segments, audio.getTime());
            if (e.code === 'Space') { e.preventDefault(); audio.isPlaying ? audio.pause() : audio.play(); }
            if (e.code === 'ArrowRight' && segments[index + 1]) audio.seek(segments[index + 1].start);
            if (e.code === 'ArrowLeft' && segments[Math.max(0, index - 1)]) audio.seek(segments[Math.max(0, index - 1)].start);
        };
        const onKeyUp = (e) => {
            const digit = /^Digit([1-9])$/.exec(e.code);
            if (digit) live.current.engine?.release(Number(digit[1]) - 1);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    const chapterIndex = chapterAt(segments, audio.currentTime);
    const chapter = segments[chapterIndex];
    const options = interfacesOfKind(kind);
    const hintText = interactive
        ? currentTrack?.player?.hint ?? 'Tryk og hold på en knap'
        : 'Træk for at se dig omkring · Klik på et kapitel for at gå dertil';

    return (
        <div className="absolute inset-0 h-svh overflow-hidden bg-paper text-ink select-none">
            <div ref={containerRef} className="absolute inset-0" onPointerDown={() => setHint(false)} />

            {/* Title, and the current chapter or the layers of the work */}
            <div className="pointer-events-none absolute left-gutter right-gutter top-14 md:top-16 flex flex-col items-start gap-3 animate-fade-in">
                <div>
                    <h2 className="font-extralight text-2xl md:text-4xl leading-none">{currentTrack?.title}</h2>
                    <Label size="lg" className="text-hard mt-2">{currentTrack?.location}</Label>
                </div>
                {interactive
                    ? <LayerLegend engine={engine} />
                    : chapter && (
                        // Same tag as the chapter title in the circular player
                        <div key={chapterIndex} className="flex max-w-80 bg-shade animate-fade-in">
                            <div className="bg-paper border-2 shrink-0 border-shade size-6 flex justify-center items-center">
                                <p className="uppercase text-xs leading-none">{chapterIndex + 1}</p>
                            </div>
                            <p className="text-paper uppercase text-xs ml-2 mr-3 self-center truncate">{chapter.title}</p>
                        </div>
                    )}
            </div>

            {/* Interface switch (test) */}
            {options.length > 1 && (
                <div className="absolute right-gutter top-14 md:top-16 flex rounded-full bg-soft p-0.5">
                    {options.map(([key, { label }]) => (
                        <button key={key} onClick={() => setOverride(key)} className={`rounded-full px-2.5 py-1.5 cursor-pointer ${key === type ? 'bg-ink text-paper' : 'md:hover:bg-muted'}`}>
                            <Label>{label}</Label>
                        </button>
                    ))}
                </div>
            )}

            {/* Big play button while paused — interactive works start from their own buttons too */}
            {!isPlaying && !worksOpen && !interactive && (
                <button onClick={() => play()} aria-label="Afspil" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-20 md:size-24 rounded-full bg-ink text-paper cursor-pointer md:hover:bg-hard transition animate-fade-in">
                    <PlayIcon className="size-8 md:size-10 translate-x-0.5" />
                </button>
            )}

            {/* Hint */}
            <p className={`pointer-events-none absolute inset-x-gutter bottom-32 md:bottom-24 text-center transition-opacity duration-700 ${hint ? 'opacity-100' : 'opacity-0'}`}>
                <Label className="text-hard">{hintText}</Label>
            </p>

            {/* Bottom bar */}
            <div className="absolute inset-x-gutter bottom-14 md:bottom-6 flex items-center gap-3 md:gap-4">
                <Button variant="pill" onClick={() => (isPlaying ? pause() : play())} aria-label={isPlaying ? 'Pause' : 'Afspil'} className="shrink-0 justify-center size-10">
                    {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5 translate-x-px" />}
                </Button>
                {interactive
                    ? <ButtonPad engine={engine} />
                    : <Timeline segments={segments} duration={duration} getTime={getTime} seek={seek} envelope={envelope} />}
                <Button variant="soft" onClick={() => setWorksOpen((o) => !o)} aria-label="Værker" className="shrink-0 rounded-full gap-1.5 h-10 px-3">
                    {worksOpen ? <XMarkIcon className="size-4" /> : <MusicalNoteIcon className="size-4" />}
                    <Label size="lg" className="hidden sm:block">Værker</Label>
                </Button>
            </div>

            <WorksDrawer open={worksOpen} onClose={() => setWorksOpen(false)} />
        </div>
    );
}

/** Index of the chapter playing at a time in seconds */
export function chapterAt(segments, seconds) {
    if (!segments?.length) return -1;
    let index = 0;
    for (let i = 0; i < segments.length; i++) if (segments[i].start <= seconds + 0.01) index = i;
    return index;
}
