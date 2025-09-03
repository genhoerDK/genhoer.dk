'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { projects } from '@/data/projects';

const AudioCtx = createContext();

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const wakeLockRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState("");

  // Initialize Audio element and AudioContext once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = "anonymous";

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
    sourceRef.current.connect(audioCtx.destination);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      audioCtx.close();
      audioRef.current.pause();
      audioRef.current = null;
    };
  }, []);

  // Get current slug from URL
  const pathname = usePathname();
  const slug = pathname?.split('/').filter(Boolean).pop();

  // Update audio and title when slug changes
  // Update audio and title when slug changes
useEffect(() => {
  if (!audioRef.current) return;

  if (!slug) {
    // Homepage: do NOT change current playback
    return;
  }

  // Try to find project by slug
  const project = projects.find(p => p.slug === slug);

  if (project && project.audio) {
    // Only change audio if there is a valid audio URL
    audioRef.current.src = project.audio;
    setTitle(project.title);
    if (isPlaying) {
      audioRef.current.play();
    }
  }
  // Else: project is null or audio is null → do nothing, continue current playback
}, [slug, isPlaying]);

  // Request wake lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
        console.log('Wake Lock active');
      }
    } catch (err) {
      console.error('Could not request Wake Lock:', err);
    }
  };

  // Play/pause toggle
  const togglePlay = async () => {
    if (!audioRef.current || !audioCtxRef.current) return;

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);

      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      await requestWakeLock();
    }
  };

  return (
    <AudioCtx.Provider value={{ isPlaying, togglePlay, title }}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);