'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useWakeLock } from 'react-screen-wake-lock';
import { projects } from '@/data/projects';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const AudioCtx = createContext();

export function AudioProvider({ children }) {
  const { isPlaying, togglePlay, title, setTrack } = useAudioPlayer();
  const { isSupported, request, release } = useWakeLock({ type: 'screen' });

  const pathname = usePathname();
  const slug = pathname?.split('/').filter(Boolean).pop();

  // Update track on slug change
  useEffect(() => {
    if (!slug) return; // homepage → keep current track
    const project = projects.find(p => p.slug === slug);
    if (project) setTrack(project);
  }, [slug, setTrack]);

  // Handle wake lock whenever playback changes
  useEffect(() => { isSupported && (isPlaying ? request() : release()); }, [isPlaying, isSupported, request, release]);

  const value = useMemo(() => ({
    isPlaying,
    togglePlay,
    title,
  }), [isPlaying, togglePlay, title]);

  return (
    <AudioCtx.Provider value={value}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);