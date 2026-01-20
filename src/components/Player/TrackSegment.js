"use client";

import { useAudio } from '@/context/AudioContext';

export default function TrackSegment({ index, startSec, endSec, duration, radius, value, onClick, onHover, onHoverEnd }) {
    const { isPlaying } = useAudio();
    if (!duration || !radius) return null;

    const start = startSec / duration;
    const end = endSec / duration;

    const gap = 0.003;
    const adjustedEnd = end - gap;
    const circumference = 2 * Math.PI * radius;
    const length = (adjustedEnd - start) * circumference;
    const offset = start * circumference;

    /** Determine if segment is active */
    const isActive = value >= start && value < end;

    const handleClick = (e) => {
        e.stopPropagation();
        onClick?.(start);
    };

    const handleMouseEnter = () => onHover?.(index);
    const handleMouseLeave = () => onHoverEnd?.();

    const mid = (start + end) / 2;
    const angle = mid * 2 * Math.PI - Math.PI / 2 - 0.01; // compensate for the gap inserted at the end of the segment

    const r = 50 * 0.8;

    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);

    return (
        <>
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
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                pointerEvents="auto"
                className={`${isPlaying && isActive && 'animate-pulse'} opacity-80 md:hover:opacity-100 md:hover:animate-none`}
            >
            </circle>

            <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={radius * 0.045}
                fill="#71717a"
                className='pointer-events-none'
            />

            <text
              x={`${x}%`}
              y={`${y}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={radius * 0.06}
              dy={radius * 0.005}
              fill="#fafafa"
              className='pointer-events-none'
            >
              {index + 1}
            </text>
        </>
    );
}