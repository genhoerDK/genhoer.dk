'use client';

/**
 * Interface: walk — a work that stood at several places in a town (Tværveje), with a few stories
 * at each. The files play through the audio element, one at a time.
 *
 * A map of the streets (src/data/maps/) shows the places as stops on the walk; the one you are at
 * is lit, and the photo behind is that place's. Under the map, the stories at the place: a button
 * per character, with the playing one filled and a line running under it. When a story ends, the
 * next one at the same place follows, so you can hear a whole place and walk on. Keys 1–3 pick a
 * story, ←/→ walk, space pauses and plays.
 *
 *   player.map         A map in src/data/maps/
 *   player.characters  [{ id, name, year }]
 *   player.places      [{ name, image, at: [x, y], label, stories: [{ character, file }] }]  at: on the map
 */

import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import { maps } from '@/data/maps/nakskov';
import { keyIsTaken } from '@/components/Player/interfaces/keys';
import PlayerShell, { Controls } from '@/components/Player/PlayerShell';
import Label from '@/components/UI/Label';

const pad = (n) => String(n).padStart(2, '0');

/** Where a place's name stands, around its dot */
const LABEL = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    above: 'bottom-full left-1/2 -translate-x-1/2 mb-0.5',
    below: 'top-full left-1/2 -translate-x-1/2 mt-0.5',
};

export default function WalkPlayer() {
    const { currentTrack, currentFile, isPlaying, progress, play, pause, playFile, ended } = useAudio();
    const { places, characters } = currentTrack.player;
    const map = maps[currentTrack.player.map];

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

    const x = (at) => `${(at[0] / map.width) * 100}%`;
    const y = (at) => `${(at[1] / map.height) * 100}%`;

    return (
        <PlayerShell track={currentTrack} image={place.image} smoke={0.3}>
            <Controls title={currentTrack.title} align='center' className='flex flex-col items-center gap-4 w-full'>
                {/* ---------- THE MAP ---------- */}
                <nav aria-label='Steder' className='relative w-full max-w-sm md:max-w-md' style={{ aspectRatio: `${map.width} / ${map.height}` }}>
                    <svg viewBox={`0 0 ${map.width} ${map.height}`} className='absolute inset-0 size-full overflow-visible' aria-hidden='true'>
                        <path d={map.water} fill='currentColor' fillOpacity='0.08' />
                        {map.streets.map((d) => (
                            <path key={d} d={d} fill='none' stroke='currentColor' strokeOpacity='0.3' strokeWidth='9' strokeLinecap='round' strokeLinejoin='round' />
                        ))}
                        {map.labels.map((l) => (
                            <text key={l.text} x={l.x} y={l.y} transform={`rotate(${l.angle} ${l.x} ${l.y})`} textAnchor='middle' fontSize='30' fill='currentColor' fillOpacity='0.4' className='uppercase'>
                                {l.text}
                            </text>
                        ))}
                        {/* The walk, from place to place */}
                        <polyline
                            points={places.map(({ at }) => at.join(',')).join(' ')}
                            fill='none' stroke='currentColor' strokeOpacity='0.6' strokeWidth='5' strokeDasharray='10 16' strokeLinecap='round'
                        />
                    </svg>
                    {places.map((stop, p) => {
                        const isHere = p === here;
                        const playsHere = playing?.p === p && isPlaying;
                        return (
                            <button
                                key={stop.name}
                                onClick={() => walkTo(p)}
                                aria-current={isHere ? 'location' : undefined}
                                className='absolute flex items-center justify-center size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer group'
                                style={{ left: x(stop.at), top: y(stop.at) }}
                            >
                                {playsHere && <span className='absolute inset-0 rounded-full bg-paper/40 animate-ping motion-reduce:hidden' />}
                                <span className={`relative block rounded-full transition-all ${isHere ? 'size-4 bg-paper' : 'size-3 bg-ink ring-1 ring-paper md:group-hover:bg-paper/70'}`} />
                                <span className={`absolute block uppercase leading-none text-xs whitespace-nowrap px-1 transition-colors ${LABEL[stop.label] ?? LABEL.below} ${isHere ? 'text-paper' : 'text-muted md:group-hover:text-paper'}`}>{stop.name}</span>
                            </button>
                        );
                    })}
                </nav>

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
