'use client';

/**
 * Interface: walk — a work that stood at several places in a town (Tværveje), with a few stories
 * at each. The files play through the audio element, one at a time.
 *
 * The town lies behind as a 3D map (WalkScene.js, three.js, loaded when the work is opened): its
 * street net and harbour (src/player/vaerker/maps.js), clear in the town and dissolving into haze
 * further out. The view is locked on the place you are at, with arrows to walk to the others. Each place is a listening station with its
 * name; the one you are at is lit. No photo behind: the map is the room. Under the map, the stories
 * at the place: the works' button (frame/SoundButton.js) per character, the ring running with the
 * playing one. When a story ends, the
 * next one at the same place follows, so you can hear a whole place and walk on. Keys 1–3 pick a
 * story, ←/→ walk, space pauses and plays.
 *
 *   player.map         A map named in src/player/vaerker/maps.js
 *   player.characters  [{ id, name, year }]
 *   player.places      [{ name, at: [x, y], label, stories: [{ character, file }] }]  at: on the map,
 *                      label: where its name stands
 */

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/player/AudioContext';
import { keyIsTaken } from '@/player/frame/keys';
import PlayerShell, { Controls } from '@/player/frame/PlayerShell';
import Label from '@/components/UI/Label';
import SoundButton from '@/player/frame/SoundButton';

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
                {/* ---------- THE STORIES HERE: the works' button (frame/SoundButton.js), one per character ---------- */}
                {/* Where you are, with arrows to walk to the others */}
                <div className='flex items-center justify-center gap-1'>
                    <button type='button' onClick={() => walkTo(here - 1)} disabled={here === 0} aria-label='Forrige sted' className='flex items-center justify-center size-10 text-paper cursor-pointer disabled:opacity-20 disabled:cursor-default'>
                        <ChevronLeftIcon className='size-5' />
                    </button>
                    <Label size='lg' className='text-faint tabular-nums'>{pad(here + 1)}/{pad(places.length)} · {place.name}</Label>
                    <button type='button' onClick={() => walkTo(here + 1)} disabled={here === places.length - 1} aria-label='Næste sted' className='flex items-center justify-center size-10 text-paper cursor-pointer disabled:opacity-20 disabled:cursor-default'>
                        <ChevronRightIcon className='size-5' />
                    </button>
                </div>
                <div className='flex justify-center gap-6 md:gap-10'>
                    {place.stories.map((story, s) => {
                        const character = characters.find((c) => c.id === story.character) ?? { name: story.character };
                        const isThis = playing?.p === here && playing?.s === s;
                        const active = isThis && isPlaying;
                        return (
                            <SoundButton
                                key={story.file}
                                size='md'
                                on={active}
                                ring={isThis ? progress : null}
                                onClick={() => (isThis ? (isPlaying ? pause() : play()) : start(here, s))}
                                ariaLabel={`${character.name} ${character.year ?? ''}: ${active ? 'pause' : 'afspil'}`}
                                aria-pressed={isThis}
                                label={character.name}
                                detail={character.year}
                            >
                                {active ? <PauseIcon className='size-6' /> : <PlayIcon className='size-6 ml-0.5' />}
                            </SoundButton>
                        );
                    })}
                </div>
            </Controls>
        </PlayerShell>
    );
}
