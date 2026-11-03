'use client';

/**
 * Interface: walk — a work that stood at several places in a town (Tværveje), with a few stories
 * at each. The files play through the audio element, one at a time.
 *
 * A small map shows the places as stops on the walk; the one you are at is lit, and the photo
 * behind is that place's. Under the map, the stories at the place: a button per character, with
 * the playing one filled and a line running under it. When a story ends, the next one at the same
 * place follows, so you can hear a whole place and walk on. Keys 1–3 pick a story, ←/→ walk.
 *
 *   player.characters  [{ id, name, year }]
 *   player.places      [{ name, image, at: [x, y], stories: [{ character, file }] }]  at: 0–1 on the map
 */

import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import PlayerShell, { Controls } from '@/components/Player/PlayerShell';
import Label from '@/components/UI/Label';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

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
        <PlayerShell track={currentTrack} image={place.image} smoke={0.3} hint='Gå fra sted til sted, og hør de tre fortællinger dér, hvor de udspiller sig.'>
            <Controls className='flex flex-col md:flex-row md:items-end gap-5 md:gap-12'>
                {/* ---------- THE MAP ---------- */}
                <nav aria-label='Steder' className='relative w-full max-w-xs md:w-72 aspect-[5/3] shrink-0'>
                    <svg viewBox='0 0 100 60' className='absolute inset-0 size-full overflow-visible' aria-hidden='true'>
                        <polyline
                            points={places.map(({ at }) => `${at[0] * 100},${at[1] * 60}`).join(' ')}
                            fill='none' stroke='currentColor' strokeOpacity='0.35' strokeWidth='0.6' strokeDasharray='1.5 2' strokeLinecap='round'
                        />
                    </svg>
                    {places.map((stop, p) => {
                        const isHere = p === here;
                        const playsHere = playing?.p === p && isPlaying;
                        // The name stands under the dot — to its right near the left edge, to its left near the right edge
                        const align = stop.at[0] < 0.3 ? 'left-0' : stop.at[0] > 0.7 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                        return (
                            <button
                                key={stop.name}
                                onClick={() => walkTo(p)}
                                aria-current={isHere ? 'location' : undefined}
                                className='absolute flex items-center justify-center size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer group'
                                style={{ left: `${stop.at[0] * 100}%`, top: `${stop.at[1] * 100}%` }}
                            >
                                {playsHere && <span className='absolute inset-0 rounded-full bg-paper/40 animate-ping motion-reduce:hidden' />}
                                <span className={`relative block rounded-full transition-all ${isHere ? 'size-3.5 bg-paper' : 'size-2.5 bg-paper/40 ring-1 ring-paper/60 md:group-hover:bg-paper/70'}`} />
                                <span className={`absolute top-full mt-1 block uppercase leading-none text-xs whitespace-nowrap transition-colors ${align} ${isHere ? 'text-paper' : 'text-faint md:group-hover:text-muted'}`}>{stop.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* ---------- THE STORIES HERE ---------- */}
                <div className='w-full max-w-md'>
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
                                    className={`relative flex flex-col items-start gap-1.5 px-3 py-2.5 text-left overflow-hidden cursor-pointer transition-colors ${isThis ? 'bg-paper text-ink' : 'bg-paper/10 text-paper md:hover:bg-paper/20'}`}
                                >
                                    <span className='flex items-center gap-1.5'>
                                        {active ? <PauseIcon className='size-4' /> : <PlayIcon className='size-4' />}
                                        <Label size='lg'>{character.name}</Label>
                                    </span>
                                    {character.year && <Label size='lg' className={`tabular-nums ${isThis ? 'text-hard' : 'text-faint'}`}>{character.year}</Label>}
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
