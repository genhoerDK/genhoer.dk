'use client';

/**
 * Interface: walk — a work that stood at several places in a town (Tværveje), with a few stories
 * at each. The files play through the audio element, one at a time.
 *
 * The town lies behind as a 3D map (WalkScene.js, three.js, loaded when the work is opened): its
 * street net and harbour (src/player/interfaces/walk/maps/), clear round where you are and dissolving into haze
 * further out. Each place is a 3D marker with its name; the one you are
 * at is lit. No photo behind: the map is the room. Under the map, the stories at the place: a button
 * per character, with the playing one filled and a line running under it. When a story ends, the
 * next one at the same place follows, so you can hear a whole place and walk on. Keys 1–3 pick a
 * story, ←/→ walk, space pauses and plays.
 *
 *   player.map         A map in src/player/interfaces/walk/maps/
 *   player.characters  [{ id, name, year }]
 *   player.places      [{ name, at: [x, y], label, stories: [{ character, file }] }]  at: on the map,
 *                      label: where its name stands
 */

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/player/AudioContext';
import { keyIsTaken } from '@/player/frame/keys';
import PlayerShell, { Controls } from '@/player/frame/PlayerShell';
import Label from '@/components/UI/Label';

/** three.js and the map only load when the work is opened */
const WalkScene = dynamic(() => import('@/player/interfaces/walk/WalkScene'), { ssr: false });

const pad = (n) => String(n).padStart(2, '0');

export default function WalkPlayer() {
    const { currentTrack, currentFile, isPlaying, progress, play, pause, playFile, ended } = useAudio();
    const { places, characters } = currentTrack.player;

    /** Where the playing story is: { p, s } or null */
    const playing = (() => {
        for (let p = 0; p < places.length; p++) {
            const s = places[p].stories.findIndex((story) => story.file === currentFile);
            if (s >= 0) return { p, s };
        }
        return null;
    })();

    /** The place you are at: where you walked to, else where the story plays */
    const [visiting, setVisiting] = useState(playing?.p ?? 0);
    const here = visiting;
    const place = places[here];
    const walkTo = (p) => setVisiting(Math.min(Math.max(p, 0), places.length - 1));
    const start = (p, s) => { setVisiting(p); playFile(places[p].stories[s].file); };

    /** When a story ends, the next one at the same place follows */
    const endedRef = useRef(ended);
    useEffect(() => {
        if (ended === endedRef.current) return;
        endedRef.current = ended;
        if (playing && places[playing.p].stories[playing.s + 1]) playFile(places[playing.p].stories[playing.s + 1].file);
    }, [ended, playing, places, playFile]);

    /** Keys: 1–3 = a story at this place, ←/→ = walk, space = play / pause */
    const keys = useRef({});
    useEffect(() => { keys.current = { start, walkTo, here, playing, isPlaying, play, pause }; });
    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat || keyIsTaken(e)) return;
            const k = keys.current;
            const n = Number(e.key);
            if (n >= 1 && n <= places[k.here].stories.length) k.start(k.here, n - 1);
            if (e.key === 'ArrowRight') k.walkTo(k.here + 1);
            if (e.key === 'ArrowLeft') k.walkTo(k.here - 1);
            if (e.key === ' ' && k.playing) { e.preventDefault(); k.isPlaying ? k.pause() : k.play(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [places]);

    return (
        <PlayerShell track={currentTrack} backdrop={false} model>
            {/* ---------- THE MAP ---------- */}
            <WalkScene map={currentTrack.player.map} places={places} here={here} sounding={playing && isPlaying ? playing.p : null} onWalk={walkTo} />

            <Controls title={currentTrack.title} align='center' className='flex flex-col items-center gap-4 w-full'>
                {/* ---------- THE STORIES HERE ---------- */}
                <div className='w-full max-w-sm md:max-w-md'>
                    <Label size='lg' className='mb-2 text-faint tabular-nums'>{pad(here + 1)}/{pad(places.length)} · {place.name}</Label>
                    <div className='grid grid-cols-3 gap-1.5 md:gap-2'>
                        {place.stories.map((story, s) => {
                            const character = characters.find((c) => c.id === story.character) ?? { name: story.character };
                            const isThis = playing?.p === here && playing?.s === s;
                            const active = isThis && isPlaying;
                            return (
                                <button
                                    key={story.file}
                                    onClick={() => (isThis ? (isPlaying ? pause() : play()) : start(here, s))}
                                    aria-label={`${character.name} ${character.year ?? ''}: ${active ? 'pause' : 'afspil'}`}
                                    aria-pressed={isThis}
                                    className={`relative flex items-center justify-center gap-1.5 h-12 sm:h-10 px-2 overflow-hidden cursor-pointer border transition-colors ${isThis ? 'bg-paper text-ink border-paper' : 'border-paper/30 text-paper md:hover:border-paper md:hover:bg-paper/10'}`}
                                >
                                    {active ? <PauseIcon className='size-3.5 shrink-0' /> : <PlayIcon className='size-3.5 shrink-0' />}
                                    <span className='flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-0'>
                                        <Label size='lg'>{character.name}</Label>
                                        {character.year && <Label size='lg' className={isThis ? 'text-hard' : 'text-faint'}><span className='hidden sm:inline'> · </span>{character.year}</Label>}
                                    </span>
                                    {isThis && (
                                        <span className='absolute inset-x-0 bottom-0 h-0.5 bg-ink/15'>
                                            <span className='block h-full bg-ink' style={{ width: `${progress * 100}%` }} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Controls>
        </PlayerShell>
    );
}
