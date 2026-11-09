'use client';

/**
 * Interface: countdown — the elevator's button and display (53 sekunder til fælles).
 *
 * Nothing plays until the button is pressed. Each press is a ride: the next of the variations
 * plays (a file each, through the audio element), the display in the button shows the number and
 * after a few seconds counts down, one count per `tempo` seconds — some rides count slower or
 * faster, and one breaks down on the way. When the ride ends the display goes dark; the next
 * press takes the next variation. A press during a ride does nothing, like the button in the
 * elevator. The ring round the button runs down with the ride's sound file, from the press until
 * the file ends (as the ring in Under overfladen), whatever the display counts. Space or Enter
 * press the button.
 *
 * When the work has a 3D scene (src/player/vaerker/scenes.js), it stands behind instead of the
 * photo (53 sekunder til fælles: the lift itself): the cabin waits at one end, and on each ride glides to the other while the
 * display counts down — at the count's pace, so a slow variation is a slow ride, and the one that
 * breaks down stops on the way, its lamp blinking. The rides go back and forth: the first (and
 * every odd one) from the hospital to the hotel, the even ones back. When a ride that broke down is
 * over, the picture fades out and in on the cabin at the far station, where the next ride sets off.
 * A variation can have weather: in a storm, rain and fog come over the place while it rides, and
 * lift again after. As in the Bela patch, the button wakes again a second after a ride's end.
 * Over the button, the variation (number / 12 and its title) opens the list of all twelve, as the
 * timeline's chapters (frame/Picker.js): the one picked is the next ride, which the button then
 * starts — a pick during a ride waits for it to end. When the cabin stands at the other station than
 * the picked variation sets off from, the picture fades while it is moved there, in the seconds
 * before the count begins.
 * The view is fixed and cannot be zoomed by hand: while a ride plays, it glides 3/4 of the way in
 * to follow the cabin (RIDE_ZOOM), and when the ride's sound has ended it glides out again.
 *
 *   player.from     the number the display starts at (53)
 *   player.delay    seconds before it starts counting
 *   player.tracks   [{ title, file, tempo, stopAt, weather }]  tempo: seconds per count; stopAt: where
 *                   the count stops (the ride breaks down there); weather: 'storm' (with a 3D scene only)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { scenes } from '@/player/vaerker/scenes';
import { useAudio } from '@/player/AudioContext';
import { keyIsTaken } from '@/player/frame/keys';
import PlayerShell, { Controls } from '@/player/frame/PlayerShell';
import SoundButton from '@/player/frame/SoundButton';
import { PickerMarker, PickerList } from '@/player/frame/Picker';

/** three.js is only loaded when the work is opened */

const pad = (n) => String(n).padStart(2, '0');

/** Mostly an even pace, softly away and softly in */
const glide = (f) => f - 0.3 * (Math.sin(2 * Math.PI * f) / (2 * Math.PI));


const RIDE_ZOOM = 0.75;   // how far the view goes in towards the cabin during a ride (0 = the whole place, 1 = closest)
const FADE = 900;   // ms: the picture fades out, and in again, when the cabin is put back after a breakdown

export default function CountdownPlayer() {
    const { currentTrack, currentFile, isPlaying, currentTime, duration, ended, play, playFile } = useAudio();
    const { tracks, from = 53, delay = 6 } = currentTrack.player;
    const Scene = scenes[currentTrack.slug];   // the work's own 3D scene (src/player/vaerker/<slug>/), if it has one
    const model = Boolean(Scene);

    const loaded = tracks.findIndex((t) => t.file === currentFile);   // the variation in the element, -1 before the first ride
    const riding = isPlaying && loaded >= 0;
    const paused = !isPlaying && loaded >= 0 && currentTime > 0;       // stopped on the way (the mini player)
    const on = riding || paused;
    const track = tracks[loaded];
    // The next ride: the one picked in the list, else the one after the last (the first to begin with)
    const [picked, setPicked] = useState(null);
    const nextIndex = picked ?? (loaded >= 0 ? (loaded + 1) % tracks.length : 0);

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
        // (a picked ride that sets off from the other station: the cabin is moved while the picture is dark)
        if (!r || r.hidden) return { at: where.current, lamp: 0, weather: null };
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

    /* After a breakdown: when the ride is over, fade out, put the cabin at the far station, and fade
       in. And after every ride, the button rests a second before it can be pressed again (main.pd) */
    const [resetting, setResetting] = useState(false);
    const [resting, setResting] = useState(false);
    const endedRef = useRef(ended);
    useEffect(() => {
        if (ended === endedRef.current) return;
        endedRef.current = ended;
        setResting(true);
        const rest = setTimeout(() => setResting(false), 1000);
        const r = ride.current;
        if (!model || !r?.stopAt) return () => clearTimeout(rest);
        setResetting(true);
        const back = setTimeout(() => {
            where.current = r.to;   // at the far station, where the next ride sets off
            if (ride.current === r) ride.current = null;
            setResetting(false);
        }, FADE + 300);
        return () => { clearTimeout(rest); clearTimeout(back); };
    }, [ended, model]);

    // While the ride plays — from the press until its sound ends — the view goes in towards the cabin
    const zoomRef = useRef(0);
    useEffect(() => { zoomRef.current = on ? RIDE_ZOOM : 0; }, [on]);

    const press = () => {
        if (riding || resetting || resting) return;
        if (paused) return play();
        const next = tracks[nextIndex];
        // Odd variations go from the hospital (0) to the hotel (1), even ones back. When the cabin
        // stands at the other end (a variation was picked), fade while it is moved there
        const side = nextIndex % 2 === 0 ? 0 : 1;
        const move = model && Math.abs(where.current - side) > 0.01;
        ride.current = {
            file: next.file, from: side, to: 1 - side, hidden: move,
            count: from, delay, tempo: next.tempo, stopAt: next.stopAt ?? 0, weather: next.weather ?? null, reached: 0,
        };
        if (move) {
            const r = ride.current;
            setResetting(true);
            setTimeout(() => { r.hidden = false; }, FADE);   // dark now: the cabin is at its station
            setTimeout(() => setResetting(false), FADE + 300);
        } else {
            where.current = side;
        }
        setPicked(null);
        setListOpen(false);
        playFile(next.file);
    };

    /* ---------- THE VARIATIONS: the marker over the button and the list it opens ---------- */

    const [listOpen, setListOpen] = useState(false);
    const listRef = useRef(null);
    const shown = on ? loaded : nextIndex;   // during a ride the one that plays, else the next
    useEffect(() => {
        if (!listOpen) return;
        const onPointer = (e) => { if (!listRef.current?.contains(e.target)) setListOpen(false); };
        window.addEventListener('pointerdown', onPointer);
        return () => window.removeEventListener('pointerdown', onPointer);
    }, [listOpen]);

    /** Space or Enter press the button; Escape closes the list */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') return setListOpen(false);
            if (e.repeat || keyIsTaken(e)) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <PlayerShell track={currentTrack} smoke={0.25} backdrop={!model} model={model}>
            {model && Scene && <Scene cabin={cabin} zoomRef={zoomRef} />}
            {model && <div className='absolute inset-0 bg-ink pointer-events-none transition-opacity ease-in-out' style={{ opacity: resetting ? 1 : 0, transitionDuration: `${FADE}ms` }} />}

            <Controls title={currentTrack.title} align='center' className='flex flex-col items-center'>
                {/* ---------- THE VARIATION (frame/Picker.js) — the list opens upwards from here ---------- */}
                <div className='relative flex justify-center w-full mb-5 h-7'>
                    {listOpen ? (
                        <PickerList
                            ref={listRef}
                            heading='Variationer'
                            className='left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-2rem))]'
                            items={tracks.map((t, i) => ({ index: i, title: t.title, detail: on && i === nextIndex && picked != null ? 'Næste' : null }))}
                            current={shown}
                            onPick={(i) => { setPicked(i); setListOpen(false); }}
                            onClose={() => setListOpen(false)}
                        />
                    ) : (
                        <PickerMarker number={shown + 1} count={tracks.length} title={tracks[shown].title} what='Variation' list='variationerne' onClick={() => setListOpen(true)} />
                    )}
                </div>

                {/* ---------- THE BUTTON (frame/SoundButton.js), with the display in it ---------- */}
                <SoundButton
                    size='lg'
                    on={on}
                    ring={left}
                    onClick={press}
                    ariaLabel={riding ? `Turen er i gang, ${count}` : `Kør, ${count}`}
                    aria-disabled={riding}
                    label={on ? (picked != null ? `Næste: ${tracks[picked].title}` : 'Turen er i gang') : undefined}
                >
                    <span aria-live='polite'>{pad(count)}</span>
                </SoundButton>
            </Controls>
        </PlayerShell>
    );
}
