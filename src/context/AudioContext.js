'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

const AudioCtx = createContext();

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const eqRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioUrl = 'https://cdn.genhoer.dk/media/grindsted-station/track.mp3';

  useEffect(() => {
    audioRef.current = new Audio(audioUrl);
    audioRef.current.crossOrigin = "anonymous"; // important for CORS when using Web Audio API

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;

    // Create EQ node example
    const eq = audioCtx.createBiquadFilter();
    eq.type = 'lowshelf';
    eq.frequency.value = 1000;
    eq.gain.value = 0;
    eqRef.current = eq;

    // Connect chain: source -> eq -> destination
    source.connect(eq);
    eq.connect(audioCtx.destination);

    // Cleanup
    return () => {
      audioCtx.close();
      audioRef.current.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current || !audioCtxRef.current) return;

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <AudioCtx.Provider value={{ isPlaying, togglePlay }}>
      {children}
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);