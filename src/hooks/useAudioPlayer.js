'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { projects } from '@/data/projects';

export function useAudioPlayer() {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState("");

  // Initialize Audio once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.crossOrigin = "anonymous";

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(audioCtx.destination);

      // Pick random default track
      const validProjects = projects.filter(p => p.audio);
      if (validProjects.length > 0) {
        const randomProject = validProjects[Math.floor(Math.random() * validProjects.length)];
        audioRef.current.src = randomProject.audio;
        setTitle(randomProject.title);
      }
    }

    return () => {
      audioCtxRef.current?.close();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const setTrack = useCallback((project) => {
    if (!audioRef.current || !project?.audio) return;

    // avoid resetting same track
    if (audioRef.current.src === project.audio) return;

    audioRef.current.src = project.audio;
    setTitle(project.title);

    if (isPlaying) {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !audioCtxRef.current) return;

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return {
    isPlaying,
    title,
    togglePlay,
    setTrack,
  };
}