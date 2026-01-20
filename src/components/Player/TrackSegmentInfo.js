import { useAudio } from '@/context/AudioContext';
import { useRef, useState, useEffect } from 'react';
import { useIsPortrait } from '@/hooks/useIsPortrait';
import Marquee from "react-fast-marquee";

export default function TrackSegmentInfo({ segments, radius }) {
    const isPortrait = useIsPortrait();
    const { currentTime } = useAudio();
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    /** Find the currently playing segment and its index  */
    const currentIndex = segments
        .map((segment, index) => ({ ...segment, index }))
        .filter(segment => segment.start <= currentTime)
        .slice(-1)[0]?.index; // get the last one that started before currentTime

    const currentSegment = segments[currentIndex];
    if (!currentSegment) return null;

    useEffect(() => {
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const textWidth = textRef.current?.scrollWidth || 0;
    setIsOverflowing(textWidth > containerWidth);
  }, [currentSegment?.title, radius])

    return (
        <div className="absolute top-20 left-2 sm:inset-auto flex gap-1 pr-3 bg-zinc-200 rounded-full overflow-hidden cursor-default shrink-0" style={!isPortrait ? { maxWidth: radius * 1.2 } : { maxWidth: "66%" }}>
            <div className="bg-zinc-500 border-2 shrink-0 border-zinc-200 size-6 rounded-full flex justify-center items-center">
                <p className="text-zinc-50 uppercase text-xs leading-none">
                    {currentIndex + 1}
                </p>
            </div>
            <div ref={containerRef} className='flex items-center overflow-hidden'>
                {isOverflowing ? 
                    <Marquee gradient={true} pauseOnHover={true} speed={20} gradientColor="#e4e4e7" gradientWidth={15}>
                        <p ref={textRef} className="text-zinc-800 uppercase px-2 text-xs leading-none whitespace-nowrap">
                            {currentSegment?.title}
                        </p>
                        <p>|</p>
                    </Marquee>
                    :
                    <p ref={textRef} className="text-zinc-800 uppercase text-xs leading-none whitespace-nowrap">
                        {currentSegment?.title}
                    </p>
                }
                
            </div>
        </div>
    );
}