'use client';

/**
 * The site's sound. One track (a project with a player) is current at a time, and it is played
 * either
 *
 *   - through one audio element (file engines: timeline, circular, countdown, walk). A work with
 *     one file (project.audio) loads it; a work with several (player.files) loads nothing until
 *     its interface picks one with playFile(). The element gives lock-screen controls and keeps
 *     playing in the background on phones.
 *   - by an engine (src/player/audio/engines.js: instrument, loop, quad), created in play() so the
 *     click unlocks sound. The interface talks to it through `engine`.
 *
 * Which is which is in src/player/interfaces/registry.js.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { projects } from '@/data/projects';
import { settingsFor } from '@/player/interfaces/registry';
import { createEngine } from '@/player/audio/engines';
import { resolveUrl } from '@/player/audio/placeholder';

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
    /** The projects that can be played */
    const projectsWithAudio = useMemo(() => projects.filter(p => !!p.player), []);

    /* ---------- STATE ---------- */

    /** Currently selected track (set on client after mount) */
    const [currentTrack, setCurrentTrack] = useState(null);

    /** The file in the audio element (file engines) — the project's audio, or one of player.files */
    const [currentFile, setCurrentFile] = useState(null);
    const currentFileRef = useRef(null);

    /** Whether playback has been explicitly started at least once */
    const [initialized, setInitialized] = useState(false);

    /** Playback state */
    const [isPlaying, setIsPlaying] = useState(false);
    const [buffering, setBuffering] = useState(false);

    /** Playback timing */
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    /** Counts up each time a file plays to its end (works that don't loop) — interfaces react to it */
    const [ended, setEnded] = useState(0);

    /** Normalized playback progress (0–1) */
    const progress = duration ? Math.min(currentTime / duration, 1) : 0;

    /* ---------- INITIAL TRACK ---------- */

    /** Select a random track on the client to avoid SSR hydration mismatch. Only works with one
     *  file that play from the toolbar: the others need their interface */
    useEffect(() => {
        const files = projectsWithAudio.filter(p => p.audio && !settingsFor(p).opens);
        if (!files.length) return;
        setCurrentTrack(files[Math.floor(Math.random() * files.length)]);
    }, [projectsWithAudio]);

    /* ---------- AUDIO ELEMENT ---------- */

    /** Persistent HTMLAudioElement reference */
    const audioRef = useRef(null);

    /** Create the audio element once */
    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.preload = 'metadata';
    }, []);

    /** Put a file in the element (only if it isn't there already) */
    const loadFile = useCallback((file) => {
        const audio = audioRef.current;
        const src = resolveUrl(file);
        if (audio.src !== src) {
            audio.src = src;
            setCurrentTime(0);
            setDuration(0);
        }
        currentFileRef.current = file;
        setCurrentFile(file);
    }, []);

    /** Sync playback time and duration from the audio element */
    useEffect(() => {
        if (!audioRef.current) return;
        const audio = audioRef.current;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration || 0);
        const handleEnded = () => {
            setCurrentTime(0);
            if (!audio.loop) {
                setIsPlaying(false);
                setEnded((n) => n + 1);
            }
        };
        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => setBuffering(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('canplay', handlePlaying);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('canplay', handlePlaying);
        };
    }, []);

    /* ---------- ENGINE ---------- */

    /** The running engine (created in play() so the click unlocks sound) */
    const engineRef = useRef(null);
    const [engine, setEngine] = useState(null);

    const disposeEngine = useCallback(() => {
        engineRef.current?.dispose();
        engineRef.current = null;
        setEngine(null);
    }, []);

    /** Close it when the provider goes away */
    useEffect(() => () => engineRef.current?.dispose(), []);

    /** Mini-player progress follows the engine */
    useEffect(() => {
        if (!engine || !isPlaying) return;
        const id = setInterval(() => {
            setDuration(engine.duration);
            setCurrentTime(engine.position);
        }, 250);
        return () => clearInterval(id);
    }, [engine, isPlaying]);

    /* ---------- TRACK CHANGE ---------- */

    /** A new track: the element gets its file (or lets go of another work's), an engine of another work is closed */
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        const settings = settingsFor(currentTrack);

        if (engineRef.current && engineRef.current.slug !== currentTrack.slug) disposeEngine();

        if (settings.engine !== 'file') {
            audio.pause();
            return;
        }
        audio.loop = settings.loop !== false;
        if (currentTrack.audio) {
            loadFile(currentTrack.audio);
        } else if (!currentTrack.player.files.includes(currentFileRef.current)) {
            // A work with several files: nothing plays until its interface picks one
            audio.pause();
            audio.removeAttribute('src');
            currentFileRef.current = null;
            setCurrentFile(null);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [currentTrack, loadFile, disposeEngine]);

    /* ---------- CONTROLS ---------- */

    // Wrapped in useCallback so they only change when the values they use change —
    // otherwise the Media Session effect below would re-run on every time update.

    /** Set a new track if it differs from the current one */
    const setTrack = useCallback((track) => {
        if (track.slug === currentTrack?.slug) return;
        setCurrentTrack(track);
    }, [currentTrack]);

    /**
     * Start playback, optionally switching to a new track and (file engines) a file of it.
     * Call it from a click: that is what lets browsers play.
     */
    const play = useCallback((track = currentTrack, file = null) => {
        const audio = audioRef.current;
        if (!audio || !track) return;
        const settings = settingsFor(track);
        const isSameTrack = track.slug === currentTrack?.slug;
        if (!isSameTrack) setCurrentTrack(track);
        if (!initialized) setInitialized(true);

        if (settings.engine !== 'file') {
            audio.pause();
            if (!engineRef.current || engineRef.current.slug !== track.slug) {
                engineRef.current?.dispose();
                engineRef.current = createEngine(settings.engine, track.player);
                engineRef.current.slug = track.slug;
                setEngine(engineRef.current);
                setCurrentTime(0);
                setDuration(0);
            }
            engineRef.current.start();
        } else {
            if (engineRef.current) disposeEngine();
            audio.loop = settings.loop !== false;
            const next = file ?? (isSameTrack ? currentFileRef.current : null) ?? track.audio ?? track.player.files[0];
            if (!next) return;
            loadFile(next);
            audio.play().catch(() => { /* the browser said no (no gesture); the UI stays as it was */ });
        }
        setIsPlaying(true);
    }, [currentTrack, initialized, loadFile, disposeEngine]);

    /** Play one of the current work's files (countdown, walk) */
    const playFile = useCallback((file) => play(currentTrack, file), [play, currentTrack]);

    /** Pause playback */
    const pause = useCallback(() => {
        audioRef.current?.pause();
        engineRef.current?.pause();
        setIsPlaying(false);
    }, []);

    /** Seek to a specific playback time (file engines) */
    const seek = useCallback((time) => {
        const audio = audioRef.current;
        if (!audio || engineRef.current) return;

        // Clamp slightly below duration to avoid edge-case lockups
        const safeTime = Math.max(0, Math.min(time, (audio.duration || duration) - 0.05));

        audio.currentTime = safeTime;
        setCurrentTime(safeTime);
    }, [duration]);

    /* ---------- MEDIA SESSION ---------- */

    /** Sync Media Session metadata and handlers with current track */
    useEffect(() => {
        if (!audioRef.current || !currentTrack || !('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: `Genhør, ${currentTrack.location}`,
            artwork: [{ src: currentTrack.artwork || '/fallback-artwork.jpg', sizes: '512x512', type: 'image/jpeg' }],
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
            currentFile,
            initialized,
            isPlaying,
            buffering,
            currentTime,
            duration,
            progress,
            ended,
            engine,
            setTrack,
            play,
            playFile,
            pause,
            seek,
        }),
        [projectsWithAudio, currentTrack, currentFile, initialized, isPlaying, buffering, currentTime, duration, progress, ended, engine, setTrack, play, playFile, pause, seek]
    );

    return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) { throw new Error('useAudio must be used within AudioProvider'); }
    return ctx;
}
