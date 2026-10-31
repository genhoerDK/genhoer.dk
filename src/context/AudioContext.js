'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { projects } from '@/data/projects';
import { LayeredEngine, unlockAudio } from '@/audio/LayeredEngine';

/** Interactive works are played by a LayeredEngine instead of the <audio> element */
export const isInteractive = (track) => !!track?.player?.tracks?.length;

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
    /** Filter projects to only those with audio */
    const projectsWithAudio = useMemo(
        () => projects.filter(p => !!p.audio || isInteractive(p)),
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

    /** Select a random track on the client to avoid SSR hydration mismatch */
    useEffect(() => {
        if (!projectsWithAudio.length) return;

        const randomTrack =
            projectsWithAudio[Math.floor(Math.random() * projectsWithAudio.length)];

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

    /** Update audio source when the active track changes */
    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;

        if (!currentTrack.audio) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
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

        if (isPlaying) audioRef.current.play().catch(() => {});
    }, [currentTrack, isPlaying]);

    /** The engine for an interactive work — created when such a work is selected */
    const [engine, setEngine] = useState(null);
    const engineRef = useRef(null);
    const pendingPlay = useRef(false);

    useEffect(() => {
        if (!isInteractive(currentTrack)) return;
        const next = new LayeredEngine(currentTrack.player);
        engineRef.current = next;
        if (pendingPlay.current) { pendingPlay.current = false; next.play(); }
        setEngine(next);
        setCurrentTime(0);
        setDuration(0);

        const sync = () => {
            setDuration(next.duration);
            setCurrentTime(next.currentTime);
            setIsPlaying(next.isPlaying);
        };
        const unsubscribe = next.subscribe(sync);
        const id = setInterval(sync, 250);

        return () => {
            unsubscribe();
            clearInterval(id);
            next.dispose();
            if (engineRef.current === next) engineRef.current = null;
            setEngine(null);
        };
    }, [currentTrack]);

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

        if (isInteractive(track)) {
            unlockAudio(); // must happen inside the click
            audioRef.current.pause();
            // The engine for a newly chosen work is created by the effect above; it starts
            // as soon as it exists because the user asked to play
            if (isSameTrack) engineRef.current?.play();
            else pendingPlay.current = true;
        } else {
            engineRef.current?.pause();
            audioRef.current.play().catch(() => {}); // interrupted when the track changes right after
        }
        setIsPlaying(true);
    }, [currentTrack, initialized]);

    /** Pause playback */
    const pause = useCallback(() => {
        if (!audioRef.current) return;

        audioRef.current.pause();
        engineRef.current?.pause();
        setIsPlaying(false);
    }, []);

    /** Seek to a specific playback time */
    const seek = useCallback((time) => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        // Clamp slightly below duration to avoid edge-case lockups
        const safeTime = Math.min(
            time,
            (audio.duration || duration) - 0.05
        );

        audio.currentTime = safeTime;
        setCurrentTime(safeTime);
    }, [duration]);

    /** Precise playback time for animation frames (state only updates a few times per second) */
    const getTime = useCallback(() => engineRef.current?.currentTime ?? audioRef.current?.currentTime ?? 0, []);

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
            setTrack,
            play,
            pause,
            seek,
            getTime,
            engine,
        }),
        [
            projectsWithAudio,
            currentTrack,
            initialized,
            isPlaying,
            currentTime,
            duration,
            progress,
            setTrack,
            play,
            pause,
            seek,
            getTime,
            engine,
        ]
    );

    return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) { throw new Error('useAudio must be used within AudioProvider'); }
    return ctx;
}