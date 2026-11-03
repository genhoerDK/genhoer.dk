'use client';

/**
 * Interface: walk — a work that stood at several places in a town (Tværveje), with a few stories
 * at each. The files play through the audio element, one at a time.
 *
 * A map of the streets (src/data/maps/) lies as a sheet in perspective, tipping and turning with
 * the pointer (or a finger on it) and drifting a little by itself; the places stand on it as stops
 * on the walk, their names as signs. The one you are at is lit, and the photo behind is that
 * place's. Under the map, the stories at the place: a button per character, with the playing one
 * filled and a line running under it. When a story ends, the next one at the same place follows,
 * so you can hear a whole place and walk on. Keys 1–3 pick a story, ←/→ walk, space pauses and plays.
 *
 *   player.map         A map in src/data/maps/
 *   player.characters  [{ id, name, year }]
 *   player.places      [{ name, image, at: [x, y], label, stories: [{ character, file }] }]  at: on the map
 */

import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import { maps } from '@/data/maps/nakskov';
import { colors } from '@/styles/colors';
import { keyIsTaken } from '@/components/Player/interfaces/keys';
import PlayerShell, { Controls } from '@/components/Player/PlayerShell';
import Label from '@/components/UI/Label';

const pad = (n) => String(n).padStart(2, '0');

/** Where a place's sign stands, around its dot */
const LABEL = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    above: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    below: 'top-full left-1/2 -translate-x-1/2 mt-1',
};

const TILT = 52, TILT_RANGE = 14, TURN_RANGE = 18;   // degrees: how the sheet lies, and how far the pointer tips and turns it

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

    /* ---------- THE SHEET: tips and turns with the pointer, drifts by itself; the signs keep facing you ---------- */

    const sheetRef = useRef(null);
    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pointer = { x: 0.5, y: 0.5 };
        const onMove = (e) => {
            // The mouse anywhere; a finger only on the map
            if (e.pointerType !== 'mouse' && !sheet.contains(e.target)) return;
            pointer.x = e.clientX / window.innerWidth;
            pointer.y = e.clientY / window.innerHeight;
        };
        const onEnd = (e) => { if (e.pointerType !== 'mouse') { pointer.x = 0.5; pointer.y = 0.5; } };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);

        let frame, t = 0, last = performance.now();
        const now = { x: 0, y: 0 };
        const tick = (time) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min((time - last) / 1000, 0.1);
            last = time;
            t += dt;
            const ease = 1 - Math.exp(-dt * 3);
            const drift = still ? 0 : Math.sin(t * 0.35) * 0.06;
            now.x += (pointer.x - 0.5 + drift - now.x) * ease;
            now.y += (pointer.y - 0.5 - now.y) * ease;
            const tilt = TILT - now.y * TILT_RANGE;
            const turn = now.x * TURN_RANGE;
            sheet.style.transform = `rotateX(${tilt}deg) rotateY(${turn}deg)`;
            for (const sign of sheet.querySelectorAll('[data-sign]')) sign.style.transform = `rotateY(${-turn}deg) rotateX(${-tilt}deg)`;
        };
        frame = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
        };
    }, []);

    return (
        <PlayerShell track={currentTrack} image={place.image} smoke={0.3}>
            <Controls title={currentTrack.title} align='center' className='flex flex-col items-center gap-4 w-full'>
                {/* ---------- THE MAP ---------- */}
                <div className='w-full max-w-sm md:max-w-lg' style={{ perspective: '900px' }}>
                <nav
                    ref={sheetRef}
                    aria-label='Steder'
                    className='relative w-full'
                    style={{ aspectRatio: `${map.width} / ${map.height}`, transformStyle: 'preserve-3d', transformOrigin: '50% 60%', transform: `rotateX(${TILT}deg)` }}
                >
                    {/* The sheet, fading out at its edges, with its shadow under it */}
                    <div className='absolute -inset-[12%] bg-ink/60 blur-xl rounded-[40%]' style={{ transform: 'translateZ(-30px)' }} aria-hidden='true' />
                    <div className='absolute -inset-[6%] bg-linear-to-b from-paper/12 to-paper/4' style={{ maskImage: 'radial-gradient(ellipse at 50% 50%, black 50%, transparent 100%)' }} aria-hidden='true' />
                    <svg viewBox={`0 0 ${map.width} ${map.height}`} className='absolute inset-0 size-full overflow-visible' style={{ maskImage: 'radial-gradient(ellipse at 50% 50%, black 60%, transparent 100%)' }} aria-hidden='true'>
                        {/* The harbour and the quay's edge */}
                        <path d={map.water} fill='currentColor' fillOpacity='0.1' />
                        <path d={map.quay} fill='none' stroke='currentColor' strokeOpacity='0.5' strokeWidth='3' strokeDasharray='6 9' strokeLinecap='round' />
                        {/* The walking street and the square, a soft band */}
                        {map.zone.map((d) => <path key={d} d={d} fill='none' stroke='currentColor' strokeOpacity='0.07' strokeWidth='64' strokeLinecap='round' strokeLinejoin='round' />)}
                        {/* The lanes */}
                        {map.side.map((d) => <path key={d} d={d} fill='none' stroke='currentColor' strokeOpacity='0.3' strokeWidth='6' strokeLinecap='round' strokeLinejoin='round' />)}
                        {/* The wider streets: a dark casing, then the street, so they read at the crossings */}
                        {map.main.map((d) => <path key={d} d={d} fill='none' stroke={colors.ink} strokeOpacity='0.55' strokeWidth='22' strokeLinecap='round' strokeLinejoin='round' />)}
                        {map.main.map((d) => <path key={d} d={d} fill='none' stroke='currentColor' strokeOpacity='0.55' strokeWidth='12' strokeLinecap='round' strokeLinejoin='round' />)}
                        {map.labels.map((l) => (
                            <text key={l.text} x={l.x} y={l.y} transform={`rotate(${l.angle} ${l.x} ${l.y})`} textAnchor='middle' fontSize='30' letterSpacing='4' fill='currentColor' fillOpacity='0.6' className='uppercase'>
                                {l.text}
                            </text>
                        ))}
                        {/* The walk, from place to place */}
                        <polyline
                            points={places.map(({ at }) => at.join(',')).join(' ')}
                            fill='none' stroke='currentColor' strokeOpacity='0.7' strokeWidth='4' strokeDasharray='8 14' strokeLinecap='round'
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
                                style={{ left: x(stop.at), top: y(stop.at), transformStyle: 'preserve-3d' }}
                            >
                                {playsHere && <span className='absolute inset-0 rounded-full bg-paper/40 animate-ping motion-reduce:hidden' />}
                                {/* The dot stands a little above the sheet, the sign stands up and faces you */}
                                <span className={`relative block rounded-full transition-all ${isHere ? 'size-4 bg-paper' : 'size-3 bg-ink ring-1 ring-paper md:group-hover:bg-paper/70'}`} style={{ transform: 'translateZ(6px)' }} />
                                <span
                                    data-sign
                                    className={`absolute block uppercase leading-none text-xs whitespace-nowrap px-1 transition-colors ${LABEL[stop.label] ?? LABEL.below} ${isHere ? 'text-paper' : 'text-muted md:group-hover:text-paper'}`}
                                    style={{ transformOrigin: '50% 100%', transform: `rotateX(${-TILT}deg)` }}
                                >
                                    {stop.name}
                                </span>
                            </button>
                        );
                    })}
                </nav>
                </div>

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
