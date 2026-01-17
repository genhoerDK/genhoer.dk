'use client';

import { useAudio } from '@/context/AudioContext';

export default function PlayerScrubber() {
  const { duration, progress, seek } = useAudio();

  const handleChange = (e) => {
    const value = Number(e.target.value);
    const time = value * duration;
    seek(time);
  };

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={progress}
      onChange={handleChange}
      className="w-full max-w-md accent-zinc-50 h-1 bg-zinc-500"
    />
  );
}