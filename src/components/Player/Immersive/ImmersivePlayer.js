'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon, MusicalNoteIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Label from '@/components/UI/Label';
import { createStage } from './stage';
import { useAudioEnvelope } from './useAudioEnvelope';
import { interfaces, interfaceFor } from './interfaces';
import Timeline from './Timeline';
import WorksDrawer from './WorksDrawer';

/**
 * Full-page, three.js based player. The 3D scene is chosen per work
 * (see interfaces/index.js); the HTML layer on top is the same for all works:
 * title, current chapter, timeline and the list of works.
 */
export default function ImmersivePlayer() {
    const audio = useAudio();
    const { currentTrack, isPlaying, play, pause, seek, getTime, duration } = audio;
    const envelope = useAudioEnvelope(currentTrack);

    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const [override, setOverride] = useState(null); // test switch between interfaces
    const [worksOpen, setWorksOpen] = useState(false);
    const [hint, setHint] = useState(true);

    const segments = currentTrack?.segments ?? [];
    const type = interfaceFor(currentTrack, override);

    /* The stage reads the latest values through a ref, so React doesn't re-render per frame */
    const live = useRef({});
    useLayoutEffect(() => { live.current = { audio, envelope, segments, duration }; });

    useEffect(() => {
        const getState = () => {
            const { audio, envelope, segments } = live.current;
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
            };
        };
        const actions = {
            play: () => live.current.audio.play(),
            pause: () => live.current.audio.pause(),
            seek: (s) => live.current.audio.seek(s),
            seekFraction: (f) => live.current.audio.seek(f * (live.current.audio.duration || 0)),
        };
        const stage = createStage(containerRef.current, { getState, actions });
        stageRef.current = stage;
        return () => { stage.dispose(); stageRef.current = null; };
    }, []);

    useEffect(() => {
        stageRef.current?.mount(interfaces[type].factory, currentTrack?.player ?? {});
    }, [type, currentTrack]);

    useEffect(() => {
        const id = setTimeout(() => setHint(false), 7000);
        return () => clearTimeout(id);
    }, []);

    /* Space toggles playback, arrows step between chapters */
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.closest?.('input, textarea, button')) return;
            const { audio, segments } = live.current;
            const index = chapterAt(segments, audio.getTime());
            if (e.code === 'Space') { e.preventDefault(); audio.isPlaying ? audio.pause() : audio.play(); }
            if (e.code === 'ArrowRight' && segments[index + 1]) audio.seek(segments[index + 1].start);
            if (e.code === 'ArrowLeft' && segments[Math.max(0, index - 1)]) audio.seek(segments[Math.max(0, index - 1)].start);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const chapterIndex = chapterAt(segments, audio.currentTime);
    const chapter = segments[chapterIndex];

    return (
        <div className="absolute inset-0 h-svh overflow-hidden bg-ink text-paper select-none">
            <div ref={containerRef} className="absolute inset-0" onPointerDown={() => setHint(false)} />

            {/* Soft vignettes so the text stays readable over the scene */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-b from-ink/80 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-ink/90 to-transparent" />

            {/* Title and current chapter */}
            <div className="pointer-events-none absolute left-gutter right-gutter top-14 md:top-16 flex flex-col gap-3 animate-fade-in">
                <div>
                    <h2 className="font-extralight text-2xl md:text-4xl leading-none">{currentTrack?.title}</h2>
                    <Label size="lg" className="text-faint mt-2">{currentTrack?.location}</Label>
                </div>
                {chapter && (
                    <div key={chapterIndex} className="flex items-center gap-2 max-w-full animate-fade-in">
                        <span className="shrink-0 border border-faint/60 px-1.5 py-1 text-[0.625rem] leading-none tabular-nums">
                            {String(chapterIndex + 1).padStart(2, '0')}<span className="text-hard">/{String(segments.length).padStart(2, '0')}</span>
                        </span>
                        <Label size="lg" className="truncate text-soft">{chapter.title}</Label>
                    </div>
                )}
            </div>

            {/* Interface switch (test) */}
            <div className="absolute right-gutter top-14 md:top-16 flex rounded-full bg-shade/70 backdrop-blur p-0.5">
                {Object.entries(interfaces).map(([key, { label }]) => (
                    <button key={key} onClick={() => setOverride(key)} className={`rounded-full px-2.5 py-1.5 cursor-pointer ${key === type ? 'bg-paper text-ink' : 'text-soft md:hover:text-paper'}`}>
                        <Label>{label}</Label>
                    </button>
                ))}
            </div>

            {/* Big play button while paused */}
            {!isPlaying && !worksOpen && (
                <button onClick={() => play()} aria-label="Afspil" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-20 md:size-24 rounded-full bg-paper/10 backdrop-blur-sm ring-1 ring-paper/30 cursor-pointer md:hover:bg-paper/20 transition animate-fade-in">
                    <PlayIcon className="size-8 md:size-10 translate-x-0.5" />
                </button>
            )}

            {/* Hint */}
            <p className={`pointer-events-none absolute inset-x-0 bottom-36 md:bottom-28 text-center transition-opacity duration-700 ${hint ? 'opacity-100' : 'opacity-0'}`}>
                <Label className="text-faint">Træk for at se dig omkring · Klik på et kapitel for at gå dertil</Label>
            </p>

            {/* Bottom bar */}
            <div className="absolute inset-x-gutter bottom-14 md:bottom-6 flex items-center gap-3 md:gap-4">
                <button onClick={() => (isPlaying ? pause() : play())} aria-label={isPlaying ? 'Pause' : 'Afspil'} className="shrink-0 flex items-center justify-center size-10 rounded-full bg-paper text-ink cursor-pointer md:hover:bg-soft">
                    {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5 translate-x-px" />}
                </button>
                <Timeline segments={segments} duration={duration} getTime={getTime} seek={seek} envelope={envelope} />
                <button onClick={() => setWorksOpen((o) => !o)} aria-label="Værker" className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-full bg-shade/70 backdrop-blur cursor-pointer md:hover:bg-paper md:hover:text-ink">
                    {worksOpen ? <XMarkIcon className="size-4" /> : <MusicalNoteIcon className="size-4" />}
                    <Label size="lg" className="hidden sm:block">Værker</Label>
                </button>
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
