'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '@/context/AudioContext';
import { CircularInput, CircularTrack, CircularProgress, CircularThumb } from 'react-circular-input';
import { PlayCircleIcon } from '@heroicons/react/20/solid';
import TrackSegment from '@/components/Player/TrackSegment';

export default function CircularScrubber() {
  const scrubberRef = useRef(null);
  const { progress, duration, seek, currentTrack, play, isPlaying } = useAudio();

  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState(progress);
  const [radius, setRadius] = useState(0);

  /** Calculate radius */
  const updateRadius = useCallback(() => {
    const container = scrubberRef.current?.parentElement;
    if (!container) return;
    const { offsetWidth: w, offsetHeight: h } = container;
    const newRadius = Math.min(w, h - 80) / 2.5;
    setRadius(prev => (prev !== newRadius ? newRadius : prev));
  }, []);

  /** Initialize radius & window resize listener */
  useEffect(() => {
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, [updateRadius]);

  /** Sync with audio progress when not dragging */
  useEffect(() => {
    if (!dragging) setLocalValue(progress);
  }, [progress, dragging]);

  /** Pointerup listener to handle drag ending outside SVG */
  useEffect(() => {
    if (!dragging) return;

    const handleGlobalPointerUp = () => {
      setDragging(false);
      seek(localValue * duration);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [dragging, localValue, duration, seek]);

  /** Seek when clicking track segments */
  const handleSegmentClick = (start) => {
    setLocalValue(start);
    seek(start * duration);
  };

  return (
    <div ref={scrubberRef} className='flex justify-center items-center size-full'>
      <CircularInput value={localValue} onChange={setLocalValue} onPointerDown={() => setDragging(true)} radius={radius} fill="none" className="pointer-events-none">
        <g className="pointer-events-auto cursor-pointer">
          <CircularTrack strokeWidth={radius * 0.1} stroke="#f4f4f5" />
          <CircularProgress strokeWidth={radius * 0.1} stroke="#d4d4d8" strokeLinecap="butt" />
          <CircularThumb r={radius * 0.06} stroke="#fafafa" strokeWidth={radius * 0.015} fill="#27272a" />
          {currentTrack.segments.map((segment, i) => (
            <TrackSegment startSec={segment.start} endSec={currentTrack.segments[i + 1]?.start ?? duration } duration={duration} value={progress} radius={radius * 0.8} onClick={handleSegmentClick}  key={i}/>
          ))}
        </g>
      </CircularInput>
      <figure className="absolute size- -z-10 rounded-full overflow-hidden" style={{ width: radius * 2, height: radius * 2}}>
          <img src={currentTrack.artwork} alt={currentTrack.title} className="size-full object-cover opacity-25" loading="lazy" />
      </figure>
      {isPlaying ? '' :
      <button className="absolute inset-auto flex items-center justify-center text-zinc-800 bg-zinc-50/50 backdrop-blur-xs cursor-pointer rounded-full overflow-hidden" style={{ width: radius * 2.2, height: radius * 2.2}} onClick={() => play()}>
        <PlayCircleIcon className="size-24" />
      </button>
      }
    </div>
  );
}