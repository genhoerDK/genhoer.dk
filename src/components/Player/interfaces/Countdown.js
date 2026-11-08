'use client';

/**
 * Interface: countdown — the elevator's button and display (53 sekunder til fælles).
 *
 * Nothing plays until the button is pressed. Each press is a ride: the next of the variations
 * plays (a file each, through the audio element), the display lights up with the number and
 * after a few seconds counts down, one count per `tempo` seconds — some rides count slower or
 * faster, and one breaks down on the way. When the ride ends the display goes dark; the next
 * press takes the next variation. A press during a ride does nothing, like the button in the
 * elevator. The ring round the button runs down with the ride's sound file, from the press until
 * the file ends (as the ring in Under overfladen), whatever the display counts. Space or Enter
 * press the button.
 *
 * With `player.model`, the lift itself is behind it in 3D (ElevatorScene.js, scene/hoejbane.js)
 * instead of the photo: the cabin waits at one end, and on each ride glides to the other while the
 * display counts down — at the count's pace, so a slow variation is a slow ride, and the one that
 * breaks down stops on the way, its lamp blinking. When that ride is over the picture fades out,
 * and fades in on the cabin back at the station it left from. A variation can have weather: in a
 * storm, rain and fog come over the place while it rides, and lift again after. The next ride
 * goes from the end the cabin stands at to the other.
 * The pointer looks round; the wheel, a pinch, ↑/↓ or the button go in close to follow the cabin.
 *
 *   player.from     the number the display starts at (53)
 *   player.delay    seconds before it starts counting
 *   player.tracks   [{ title, file, tempo, stopAt, weather }]  tempo: seconds per count; stopAt: where
 *                   the count stops (the ride breaks down there); weather: 'storm' (the model only)
 *   player.model    true: the lift in 3D behind (default: the photo)
 *   player.look     the model's look: 'dark' (greys on the dark, as Tværveje) or 'pale' (default)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAudio } from '@/context/AudioContext';
import { keyIsTaken } from '@/components/Player/interfaces/keys';
import PlayerShell, { Controls } from '@/components/Player/PlayerShell';
import Label from '@/components/UI/Label';

/** three.js is only loaded when the work is opened */
const ElevatorScene = dynamic(() => import('@/components/Player/ElevatorScene'), { ssr: false });

const pad = (n) => String(n).padStart(2, '0');

/** Mostly an even pace, softly away and softly in */
const glide = (f) => f - 0.3 * (Math.sin(2 * Math.PI * f) / (2 * Math.PI));

const RADIUS = 47;                       // the ring round the button (as Under overfladen's)
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const FADE = 900;   // ms: the picture fades out, and in again, when the cabin is put back after a breakdown

export default function CountdownPlayer() {
    const { currentTrack, currentFile, isPlaying, currentTime, duration, ended, play, playFile } = useAudio();
    const { tracks, from = 53, delay = 6, model = false, look } = currentTrack.player;

    const loaded = tracks.findIndex((t) => t.file === currentFile);   // the variation in the element, -1 before the first ride
    const riding = isPlaying && loaded >= 0;
    const paused = !isPlaying && loaded >= 0 && currentTime > 0;       // stopped on the way (the mini player)
    const on = riding || paused;
    const track = tracks[loaded];
    const nextIndex = loaded >= 0 ? (loaded + 1) % tracks.length : 0;

    // The ring: what is left of the ride's sound file, full at the press and empty when it ends
    // (whatever the display counts)
    const left = on ? (duration > 0 ? Math.max(0, 1 - currentTime / duration) : 1) : 0;

    // The display: `from`, and after `delay` seconds one count less per `tempo` seconds, down to stopAt
    const count = on ? Math.max(track.stopAt ?? 0, from - Math.floor(Math.max(0, currentTime - delay) / (track.tempo || 1))) : from;

    /* ---------- THE CABIN (with the model) ---------- */

    // Where the cabin stands along the track (0 = the hospital, 1 = the other side), the ride it is
    // on, and the audio's clock as last heard, so the scene can move it smoothly between time updates
    const where = useRef(0);
    const ride = useRef(null);
    const clock = useRef({ file: null, time: 0, stamp: 0, playing: false });
    useEffect(() => {
        clock.current = { file: currentFile, time: currentTime, stamp: performance.now(), playing: isPlaying };
    }, [currentFile, currentTime, isPlaying]);

    /** Where the cabin is now, its lamp (0 off, 1 riding, 2 stopped on the way: blinking), and the weather */
    const cabin = useCallback(() => {
        const r = ride.current;
        if (!r) return { at: where.current, lamp: 0, weather: null };
        const c = clock.current;
        const live = c.file === r.file;
        const moving = live && c.playing;
        const time = live ? c.time + (moving ? Math.min(0.5, (performance.now() - c.stamp) / 1000) : 0) : 0;
        const counted = Math.max(0, time - r.delay) / (r.tempo || 1);
        // never back: when the ride ends the element's time goes to 0, and the cabin stays where it got to
        r.reached = Math.max(r.reached, Math.min(counted, r.count - r.stopAt) / r.count);
        where.current = r.from + (r.to - r.from) * (r.stopAt ? r.reached : glide(r.reached));
        return {
            at: where.current,
            lamp: !moving ? 0 : r.stopAt && counted >= r.count - r.stopAt ? 2 : 1,
            weather: live && (c.playing || c.time > 0) ? r.weather : null,   // while the ride lasts
        };
    }, []);

    /* After a breakdown: when the ride is over, fade out, put the cabin back at the station it left
       from, and fade in */
    const [resetting, setResetting] = useState(false);
    const endedRef = useRef(ended);
    useEffect(() => {
        if (ended === endedRef.current) return;
        endedRef.current = ended;
        const r = ride.current;
        if (!model || !r?.stopAt) return;
        setResetting(true);
        const back = setTimeout(() => {
            where.current = r.from < 0.5 ? 0 : 1;
            if (ride.current === r) ride.current = null;
            setResetting(false);
        }, FADE + 300);
        return () => clearTimeout(back);
    }, [ended, model]);

    const zoomRef = useRef(0);
    const [close, setClose] = useState(false);

    const press = () => {
        if (riding || resetting) return;
        if (paused) return play();
        const next = tracks[nextIndex];
        // From where the cabin stands to the far end
        ride.current = {
            file: next.file, from: where.current, to: where.current < 0.5 ? 1 : 0,
            count: from, delay, tempo: next.tempo, stopAt: next.stopAt ?? 0, weather: next.weather ?? null, reached: 0,
        };
        playFile(next.file);
    };

    /** Space or Enter press the button */
    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat || keyIsTaken(e)) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <PlayerShell track={currentTrack} smoke={0.25} backdrop={!model}>
            {model && <ElevatorScene cabin={cabin} zoomRef={zoomRef} onZoom={setClose} look={look} />}
            {model && <div className='absolute inset-0 bg-ink pointer-events-none transition-opacity ease-in-out' style={{ opacity: resetting ? 1 : 0, transitionDuration: `${FADE}ms` }} />}

            <Controls title={currentTrack.title} align='center' className='flex flex-col items-center gap-5 md:gap-6'>
                <div className={`flex items-center ${model ? 'flex-row gap-7 md:gap-9' : 'flex-col gap-5 md:gap-6'}`}>
                    {/* ---------- THE DISPLAY ---------- */}
                    <div className='flex flex-col items-center'>
                        <div
                            aria-live='polite'
                            className={`font-extralight tabular-nums leading-none transition-opacity duration-500 ${model ? 'text-[4.5rem] md:text-[5.5rem]' : 'text-[6rem] md:text-[8rem]'} ${on ? 'opacity-100' : model ? 'opacity-50' : 'opacity-15'}`}
                        >
                            {pad(count)}
                        </div>
                        <Label size='lg' className={`mt-3 ${model ? 'text-muted' : 'text-faint'}`}>
                            {on ? `${track.title} af ${tracks.length}` : 'Tryk, og kør med'}
                        </Label>
                    </div>

                    {/* ---------- THE BUTTON ---------- */}
                    <button
                        onClick={press}
                        aria-label={riding ? 'Turen er i gang' : 'Kør'}
                        aria-disabled={riding}
                        className={`relative flex items-center justify-center size-20 shrink-0 rounded-full transition-colors group ${riding ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                        {/* The ring: the ride's sound running down, from the press until the file ends */}
                        <svg viewBox='0 0 100 100' className='absolute inset-0 size-full -rotate-90' aria-hidden='true'>
                            <circle cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth='1.5' className={`transition-opacity ${riding ? 'opacity-20' : 'opacity-30 md:group-hover:opacity-100'}`} />
                            <circle
                                cx='50' cy='50' r={RADIUS} fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={CIRCUMFERENCE * (1 - left)}
                                style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                            />
                        </svg>
                        <span className={`block size-14 rounded-full transition-colors ${riding ? 'bg-paper/20' : 'bg-paper md:group-hover:bg-muted'}`} />
                    </button>
                </div>

                {/* ---------- IN CLOSE, OR THE WHOLE PLACE (the model) ---------- */}
                {model && (
                    <button onClick={() => { zoomRef.current = close ? 0 : 1; }} aria-pressed={close} className={`px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${close ? 'bg-paper text-ink border-paper' : 'border-paper/50 text-soft'}`}>
                        <Label size='lg'>{close ? 'Se det hele' : 'Følg kabinen'}</Label>
                    </button>
                )}
            </Controls>
        </PlayerShell>
    );
}
