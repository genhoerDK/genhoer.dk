import { useAudio } from '@/context/AudioContext';
import { useRef, useState, useEffect } from 'react';
import Marquee from "react-fast-marquee";

export default function TrackSegmentInfo({ segments, radius }) {
    const { currentTime } = useAudio();
    const textRef = useRef(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    /** Find the currently playing segment and its index  */
    const currentIndex = segments
        .map((segment, index) => ({ ...segment, index }))
        .filter(segment => segment.start <= currentTime)
        .slice(-1)[0]?.index; // get the last one that started before currentTime

    const currentSegment = segments[currentIndex];
    
    useEffect(() => {
        const containerWidth = 280;
        const textWidth = textRef.current?.scrollWidth || 0;
        setIsOverflowing(textWidth > containerWidth);
    }, [currentSegment])

    if (!currentSegment) return null;

    return (
        <>
            <figure className="absolute rounded-full overflow-hidden bg-zinc-800" style={{ width: radius * 1.25, height: radius * 1.25 }}>
              <img src={currentSegment.image} alt={currentSegment.title} className="size-full object-cover opacity-75" loading="lazy" />
            </figure>
            <div className="absolute top-20 left-2 flex gap-1 max-w-80 pr-3 bg-zinc-200 rounded-full cursor-default md:left-4">
                <div className="bg-zinc-500 border-2 shrink-0 border-zinc-200 size-6 rounded-full flex justify-center items-center">
                    <p className="text-zinc-50 uppercase text-xs leading-none">
                        {currentIndex + 1}
                    </p>
                </div>
                <div className='flex items-center overflow-hidden'>
                    {isOverflowing ? 
                        <Marquee gradient={true} pauseOnHover={true} speed={25} gradientColor="#e4e4e7" gradientWidth={15}>
                            <p ref={textRef} className="text-zinc-800 uppercase text-xs mx-2.5 py-1 whitespace-nowrap">{currentSegment?.title}</p>
                            <div className="bg-zinc-900 size-1" />
                        </Marquee>
                        :
                        <p ref={textRef} className="text-zinc-800 uppercase text-xs whitespace-nowrap">{currentSegment?.title}</p>
                    }

                </div>
            </div>
        </>
    );
}