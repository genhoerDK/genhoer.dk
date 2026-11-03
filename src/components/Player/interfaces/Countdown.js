'use client';

/**
 * Interface: countdown — the elevator's button and display (53 sekunder til fælles).
 *
 * Each press is a ride: the next of the variations plays (a file each, through the audio element),
 * the display lights up with the number and after a few seconds counts down, one count per
 * `tempo` seconds — some rides count slower or faster, and one breaks down on the way. When the
 * ride ends the display goes dark; the next press takes the next variation. A press during a ride
 * does nothing, like the button in the elevator; the dots under the display pick a variation
 * directly. Space or Enter press the button.
 *
 *   player.from     the number the display starts at (53)
 *   player.delay    seconds before it starts counting
 *   player.tracks   [{ title, file, tempo, stopAt }]  tempo: seconds per count; stopAt: where the count stops
 */

import { useEffect } from 'react';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import PlayerShell, { Controls } from '@/components/Player/PlayerShell';
import Label from '@/components/UI/Label';
import { keyIsTaken } from '@/components/Player/interfaces/keys';

const pad = (n) => String(n).padStart(2, '0');

export default function CountdownPlayer() {
    const { currentTrack, currentFile, isPlaying, currentTime, play, playFile } = useAudio();
    const { tracks, from = 53, delay = 6 } = currentTrack.player;

    const loaded = tracks.findIndex((t) => t.file === currentFile);   // the variation in the element, -1 before the first ride
    const riding = isPlaying && loaded >= 0;
    const paused = !isPlaying && loaded >= 0 && currentTime > 0;       // stopped on the way (the mini player)
    const on = riding || paused;
    const track = tracks[loaded];
    const nextIndex = loaded >= 0 ? (loaded + 1) % tracks.length : 0;

    // The display: `from`, and after `delay` seconds one count less per `tempo` seconds, down to stopAt
    const count = on ? Math.max(track.stopAt ?? 0, from - Math.floor(Math.max(0, currentTime - delay) / (track.tempo || 1))) : from;

    const press = () => {
        if (riding) return;
        if (paused) return play();
        playFile(tracks[nextIndex].file);
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
        <PlayerShell track={currentTrack} smoke={0.25} hint='Tryk på knappen, og kør med. Hver tur er en ny variation af de 53 sekunder.'>
            <Controls className='flex flex-col items-center gap-5 md:gap-6'>
                {/* ---------- THE DISPLAY ---------- */}
                <div className='flex flex-col items-center'>
                    <div
                        aria-live='polite'
                        className={`font-extralight tabular-nums leading-none text-[6rem] md:text-[8rem] transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-15'}`}
                    >
                        {pad(count)}
                    </div>
                    <Label size='lg' className='mt-3 text-muted'>
                        {on ? `${track.title} af ${tracks.length}` : loaded >= 0 ? `Næste: ${tracks[nextIndex].title}` : 'Tryk, og kør med'}
                    </Label>
                </div>

                {/* ---------- THE BUTTON ---------- */}
                <button
                    onClick={press}
                    aria-label={riding ? 'Turen er i gang' : 'Kør'}
                    aria-disabled={riding}
                    className={`flex items-center justify-center size-20 rounded-full border transition-colors group ${riding ? 'border-paper/60 cursor-default' : 'border-paper/30 cursor-pointer md:hover:border-paper'}`}
                >
                    <span className={`flex items-center justify-center size-14 rounded-full transition-colors ${riding ? 'bg-paper text-ink animate-pulse' : 'bg-paper text-ink md:group-hover:bg-muted'}`}>
                        <ArrowRightIcon className='size-7' />
                    </span>
                </button>

                {/* ---------- THE VARIATIONS ---------- */}
                <ol className='flex gap-2.5' aria-label='Variationer'>
                    {tracks.map((t, i) => (
                        <li key={t.file}>
                            <button
                                onClick={() => playFile(t.file)}
                                aria-label={t.title}
                                aria-current={i === loaded ? 'true' : undefined}
                                className='flex items-center justify-center size-5 -m-1 cursor-pointer group'
                            >
                                <span className={`block size-2 rounded-full transition-colors ${i === loaded ? 'bg-paper' : i === nextIndex ? 'bg-paper/50' : 'bg-paper/20'} md:group-hover:bg-paper`} />
                            </button>
                        </li>
                    ))}
                </ol>
            </Controls>
        </PlayerShell>
    );
}
