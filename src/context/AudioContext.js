'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { projects } from '@/data/projects';
import { instruments } from '@/data/instruments';
import Instrument from '@/audio/Instrument';

/** Projects played with buttons (src/data/instruments.js) instead of as one audio file */
export const isInstrument = (track) => !!instruments[track?.player];

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
    /** Filter projects to only those with audio — a file or an instrument */
    const projectsWithAudio = useMemo(
        () => projects.filter(p => !!p.audio || isInstrument(p)),
        []
    );

    /* ---------- STATE ---------- */

    /** Currently selected track (set on client after mount) */
    const [currentTrack, setCurrentTrack] = useState(null);

    /** Whether playback has been explicitly started at least once */
    const [initialized, setInitialized] = useState(false);

    /** Playback state */
    const [isPlaying, setIsPlaying] = useState(false);

    /** Playback timing */
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    /** Normalized playback progress (0–1) */
    const progress = duration
        ? Math.min(currentTime / duration, 1)
        : 0;

    /* ---------- INITIAL TRACK ---------- */

    /** Select a random track on the client to avoid SSR hydration mismatch.
     *  Only plain audio files: an instrument is silent until someone presses its buttons */
    useEffect(() => {
        const files = projectsWithAudio.filter(p => !!p.audio);
        if (!files.length) return;

        const randomTrack =
            files[Math.floor(Math.random() * files.length)];

        setCurrentTrack(randomTrack);
    }, [projectsWithAudio]);

    /* ---------- AUDIO ELEMENT ---------- */

    /** Persistent HTMLAudioElement reference */
    const audioRef = useRef(null);

    /** Create the audio element once and enable looping */
    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
    }, []);

    /* ---------- INSTRUMENT ---------- */

    /** The running instrument (created in play() so the click unlocks audio) */
    const instrumentRef = useRef(null);
    const [instrument, setInstrument] = useState(null);

    /** Close the instrument when another track takes over */
    useEffect(() => {
        if (isInstrument(currentTrack) || !instrumentRef.current) return;
        instrumentRef.current.dispose();
        instrumentRef.current = null;
        setInstrument(null);
    }, [currentTrack]);

    /** Close it when the provider goes away */
    useEffect(() => () => instrumentRef.current?.dispose(), []);

    /** Mini-player progress follows the music loop */
    useEffect(() => {
        if (!instrument || !isPlaying) return;
        const id = setInterval(() => {
            setDuration(instrument.loopDuration);
            setCurrentTime(instrument.loopPosition);
        }, 250);
        return () => clearInterval(id);
    }, [instrument, isPlaying]);

    /** Update audio source when the active track changes */
    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;

        if (isInstrument(currentTrack)) {
            audioRef.current.pause();
            return;
        }

        const nextSrc = new URL(
            currentTrack.audio,
            window.location.href
        ).href;

        // Only update src if it has actually changed
        if (audioRef.current.src !== nextSrc) {
            audioRef.current.src = currentTrack.audio;
            setCurrentTime(0);
            setDuration(0);
        }

        if (isPlaying) audioRef.current.play();
    }, [currentTrack, isPlaying]);

    /** Sync playback time and duration from the audio element */
    useEffect(() => {
        if (!audioRef.current) return;
        const audio = audioRef.current;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration || 0);
        const handleEnded = () => setCurrentTime(0);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    /* ---------- CONTROLS ---------- */

    // Wrapped in useCallback so they only change when the values they use change —
    // otherwise the Media Session effect below would re-run on every time update.

    /** Set a new track if it differs from the current one */
    const setTrack = useCallback((track) => {
        if (track.slug === currentTrack?.slug) return;
        setCurrentTrack(track);
    }, [currentTrack]);

    /** Start playback, optionally switching to a new track */
    const play = useCallback((track = currentTrack) => {
        if (!audioRef.current || !track) return;

        const isSameTrack = track.slug === currentTrack?.slug;
        if (!isSameTrack) setCurrentTrack(track);

        if (!initialized) setInitialized(true);

        if (isInstrument(track)) {
            audioRef.current.pause();
            if (!isSameTrack || !instrumentRef.current) {
                instrumentRef.current?.dispose();
                instrumentRef.current = new Instrument(instruments[track.player]);
                setInstrument(instrumentRef.current);
                setCurrentTime(0);
                setDuration(0);
            }
            instrumentRef.current.start();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(true);
    }, [currentTrack, initialized]);

    /** Pause playback */
    const pause = useCallback(() => {
        if (!audioRef.current) return;

        audioRef.current.pause();
        instrumentRef.current?.pause();
        setIsPlaying(false);
    }, []);

    /** Seek to a specific playback time */
    const seek = useCallback((time) => {
        if (!audioRef.current || isInstrument(currentTrack)) return;

        const audio = audioRef.current;

        // Clamp slightly below duration to avoid edge-case lockups
        const safeTime = Math.min(
            time,
            (audio.duration || duration) - 0.05
        );

        audio.currentTime = safeTime;
        setCurrentTime(safeTime);
    }, [duration, currentTrack]);

    /* ---------- MEDIA SESSION ---------- */

    /** Sync Media Session metadata and handlers with current track */
    useEffect(() => {
        if (
            !audioRef.current ||
            !currentTrack ||
            !('mediaSession' in navigator)
        ) {
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: `Genhør, ${currentTrack.location}`,
            artwork: [
                {
                    src: currentTrack.artwork || '/fallback-artwork.jpg',
                    sizes: '512x512',
                    type: 'image/jpeg',
                },
            ],
        });

        // Wrapped: the browser passes an event object, which play() would treat as a track
        navigator.mediaSession.setActionHandler('play', () => play());
        navigator.mediaSession.setActionHandler('pause', () => pause());

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            audioRef.current.currentTime -= details.seekOffset || 10;
        });

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            audioRef.current.currentTime += details.seekOffset || 10;
        });
    }, [currentTrack, play, pause]);

    /* ---------- CONTEXT VALUE ---------- */

    const value = useMemo(
        () => ({
            projectsWithAudio,
            currentTrack,
            initialized,
            isPlaying,
            currentTime,
            duration,
            progress,
            instrument,
            setTrack,
            play,
            pause,
            seek,
        }),
        [
            projectsWithAudio,
            currentTrack,
            initialized,
            isPlaying,
            currentTime,
            duration,
            progress,
            instrument,
            setTrack,
            play,
            pause,
            seek,
        ]
    );

    return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) { throw new Error('useAudio must be used within AudioProvider'); }
    return ctx;
}