"use client";

import { useAudio } from '@/context/AudioContext';

export default function TrackSegment({ startSec, endSec, duration, radius, value, onClick }) {
    if (!duration || !radius) return null;
    const { isPlaying } = useAudio();

    const start = startSec / duration;
    const end = endSec / duration;

    const gap = 0.01;
    const adjustedEnd = end - gap;
    const circumference = 2 * Math.PI * radius;
    const length = (adjustedEnd - start) * circumference;
    const offset = start * circumference;

    /** Determine if this segment is active */
    const isActive = value >= start && value < end;

    const handleClick = (e) => {
        e.stopPropagation();
        onClick?.(start);
    };

    return (
        <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="#fafafa"
            strokeWidth={radius * 0.25}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ cursor: "pointer", transform: "rotate(-90deg)", transformOrigin: "50% 50%", transformBox: "fill-box", }}
            onClick={handleClick}
            pointerEvents="auto"
            className={`${isPlaying && isActive && 'animate-pulse'} opacity-80 md:hover:opacity-100 md:hover:animate-none`}
        />
    );
}