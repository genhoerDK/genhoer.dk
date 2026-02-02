'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '@/context/AudioContext';
import { CircularInput, CircularTrack, CircularProgress, CircularThumb } from 'react-circular-input';
import { PlayCircleIcon } from '@heroicons/react/20/solid';
import BackgroundImage from '@/components/BackgroundImage';
import TrackSegment from '@/components/Player/TrackSegment';
import TrackSegmentInfo from '@/components/Player/TrackSegmentInfo'

export default function CircularScrubber() {
  const { progress, duration, seek, currentTrack, play, isPlaying } = useAudio();

  const scrubberRef = useRef(null);

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
    <div ref={scrubberRef} className='flex justify-center items-center size-full min-h-160'>
      {/* <BackgroundImage src={currentTrack?.coverImageLandscape} /> */}
      <CircularInput value={localValue} onChange={setLocalValue} onPointerDown={() => setDragging(true)} radius={radius} fill="none" className="absolute pointer-events-none z-10">
        <g className="pointer-events-auto cursor-pointer">
          <CircularTrack strokeWidth={radius * 0.05} stroke="#a1a1aa" />
          <CircularProgress strokeWidth={radius * 0.05} stroke="#52525b" strokeLinecap="butt" />
          <CircularThumb r={radius * 0.075} stroke="#27272a" strokeWidth={0} fill="#52525b" />
          {currentTrack?.segments.map((segment, i) => (
            <TrackSegment index={i} startSec={segment.start} endSec={currentTrack?.segments[i + 1]?.start ?? duration } duration={duration} value={progress} radius={radius * 0.8} onClick={handleSegmentClick} key={i} />
          ))}
        </g>
      </CircularInput>
      <h2 className='absolute left-2 md:left-4 top-12 leading-none uppercase font-extralight text-lg md:text-xl'>{currentTrack?.title}</h2>

      {isPlaying ?
        <TrackSegmentInfo segments={currentTrack?.segments} radius={radius} />
      :
        <button className="absolute inset-auto flex items-center justify-center cursor-pointer rounded-full z-10" style={{ width: radius * 2.25, height: radius * 2.25}} onClick={() => play()}>
          <div className="absolute size-full bg-radial from-paper to-paper blur-sm opacity-80 rounded-full"></div>
          <PlayCircleIcon className="size-24 text-ink z-10" />
        </button>
      }
    </div>
  );
}