'use client';

import { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { projects } from '@/data/projects';

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
  const projectsWithAudio = projects.filter(p => !!p.audio);
  const randomTrack = projectsWithAudio[Math.floor(Math.random() * projectsWithAudio.length)];

  /* ---------- STATES ---------- */

  const [currentTrack, setCurrentTrack] = useState(randomTrack);
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const progress = duration ? Math.min(currentTime / duration, 1) : 0;

  /* ---------- AUDIO ELEMENT ---------- */

  const audioRef = useRef(null);

  // Create audio element once and set to loop
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
  }, []);

  // Update source when track changes (and only if the src is actually new)
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const nextSrc = new URL(currentTrack.audio, window.location.href).href;

    if (audioRef.current.src !== nextSrc) {
      audioRef.current.src = currentTrack.audio;
      setCurrentTime(0);
      setDuration(0);
    }

    if (isPlaying) audioRef.current.play();
  }, [currentTrack, isPlaying]);

  // Sync audio playback state (time & duration)
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

  const setTrack = (track) => {
    if (track.slug === currentTrack?.slug) return; // only set new track
    setCurrentTrack(track);
  };

  const play = (track = currentTrack) => {
    if (!audioRef.current) return;
    
    const isSameTrack = track.slug === currentTrack?.slug;
    if (!isSameTrack) setCurrentTrack(track); // only set if it is new track
  
    if (!initialized) setInitialized(true);
  
    audioRef.current.play();
    setIsPlaying(true);
};

  const pause = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
  };

  const seek = (time) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Clamp to avoid hitting the exact duration
    const safeTime = Math.min(time, (audio.duration || duration) - 0.05);

    audio.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  /* ---------- MEDIA SESSION ---------- */
  useEffect(() => {
    if (!audioRef.current || !currentTrack || !('mediaSession' in navigator)) return;

    // Set track metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: 'Genhør, ' + currentTrack.location,
      artwork: [
        { src: currentTrack.artwork || '/fallback-artwork.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    // Media control handlers
    navigator.mediaSession.setActionHandler('play', () => {
      play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      audioRef.current.currentTime -= details.seekOffset || 10;
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      audioRef.current.currentTime += details.seekOffset || 10;
    });
  }, [currentTrack, play, pause]);

  /* ---------- CONTEXT ---------- */

  const value = useMemo(() => ({
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
    seek
  }), [projectsWithAudio, currentTrack, isPlaying, initialized, currentTime, duration, progress]);

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return ctx;
}