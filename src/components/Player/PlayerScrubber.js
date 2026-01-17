'use client';

import { useState, useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';

export default function AudioProgress() {
  const { progress, duration, seek } = useAudio();

  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState(progress);

  // Sync with audio only when not dragging
  useEffect(() => {
    if (!dragging) {
      setLocalValue(progress);
    }
  }, [progress, dragging]);

  const handlePointerDown = () => {
    setDragging(true);
  };

  const handleChange = (e) => {
    setLocalValue(Number(e.target.value));
  };

  const handlePointerUp = () => {
    setDragging(false);
    seek(localValue >= 0.999 ? duration - 0.05 : localValue * duration);
  };

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={localValue}
      onPointerDown={handlePointerDown}
      onChange={handleChange}
      onPointerUp={handlePointerUp}
      className="w-full max-w-md h-1 rounded-lg bg-zinc-300 accent-zinc-900"
    />
  );
}
