'use client';

import { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { projects } from '@/data/projects';

const AudioCtx = createContext(null);

export function AudioProvider({ children }) {
  const projectsWithAudio = projects.filter(p => !!p.audio);
  const randomTrack = Math.floor(Math.random() * projectsWithAudio.length);

  /* ---------- STATE ---------- */

  const [currentTrack, setCurrentTrack] = useState(projectsWithAudio[randomTrack]);
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? currentTime / duration : 0;

  /* ---------- AUDIO ELEMENT ---------- */

  const audioRef = useRef(null);

  // Create audio element once
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

    console.log('[Audio] setTrack:', track.audio);
  };

  const play = (track = currentTrack) => {
    if (!audioRef.current) return;
    
    const isSameTrack = track.slug === currentTrack?.slug;
    if (!isSameTrack) setCurrentTrack(track); // only set new track
  
    if (!initialized) setInitialized(true);
  
    audioRef.current.play();
    setIsPlaying(true);

    console.log('[Audio] play:', track.audio);
};

  const pause = () => {
    if (!audioRef.current) return;

    console.log('[Audio] pause:', currentTrack.audio);

    audioRef.current.pause();
    setIsPlaying(false);
  };

  // Set time
  const seek = (time) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  /* ---------- MEDIA SESSION ---------- */
  useEffect(() => {
    if (!audioRef.current || !currentTrack || !('mediaSession' in navigator)) return;

    // Set track metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: 'Genhør, ' + currentTrack.location,
      artwork: [
        { src: currentTrack.artwork || '/fallback-artwork.jpg', sizes: '512x512', type: 'image/jpeg' }, // SET PROPER IMAGES!!!
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
  }), [currentTrack, isPlaying, initialized, currentTime, duration, progress]);

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