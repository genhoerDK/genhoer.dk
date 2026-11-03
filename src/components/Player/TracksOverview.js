'use client';

/**
 * The works (?lyt=vaerker): a row of round covers to swipe through, starting at the work that
 * plays. A click on a cover to the side brings it to the middle; a click on the one in the middle
 * plays it and closes the overview. Mouse wheel and ←/→ move it too.
 */

import 'swiper/css';
import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import { PlayIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Label from '@/components/UI/Label';

export default function TracksOverview({ toggleOverview }) {
    const { projectsWithAudio, play, currentTrack, isPlaying } = useAudio();
    const swiperRef = useRef(null);
    const start = Math.max(0, projectsWithAudio.findIndex((p) => p.slug === currentTrack?.slug));

    const handleClick = (project, i) => {
        const swiper = swiperRef.current;
        if (swiper && swiper.activeIndex !== i) return swiper.slideTo(i);
        play(project);
        toggleOverview();
    };

    return (
        <div className='relative flex items-center size-full bg-ink text-paper'>
            <Swiper
                modules={[Mousewheel, Keyboard]}
                onSwiper={(s) => { swiperRef.current = s; }}
                initialSlide={start}
                centeredSlides={true}
                slidesPerView='auto'
                spaceBetween={16}
                grabCursor={true}
                keyboard={{ enabled: true }}
                mousewheel={{ forceToAxis: false, sensitivity: 0.6, thresholdDelta: 8 }}
                speed={350}
                breakpoints={{ 768: { spaceBetween: 32 } }}
                className='w-full'
            >
                {projectsWithAudio.map((project, i) => {
                    const isCurrent = project.slug === currentTrack?.slug;
                    return (
                        <SwiperSlide key={project.slug} className='!w-56 md:!w-72'>
                            {({ isActive }) => (
                                <button
                                    onClick={() => handleClick(project, i)}
                                    aria-label={isActive ? `Afspil ${project.title}` : project.title}
                                    className={`flex flex-col items-center gap-4 w-full cursor-pointer transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40 md:hover:opacity-70'}`}
                                >
                                    <span className={`relative block size-48 md:size-64 rounded-full overflow-hidden transition-shadow duration-300 ${isActive ? 'ring-1 ring-paper/70' : ''}`}>
                                        <img src={project.coverImageSmall} alt='' className='size-full object-cover grayscale' loading='lazy' draggable={false} />
                                        {isActive && (
                                            <span className='absolute inset-0 flex items-center justify-center'>
                                                <span className='flex items-center justify-center size-16 rounded-full bg-paper text-ink'><PlayIcon className='size-7 ml-0.5' /></span>
                                            </span>
                                        )}
                                    </span>
                                    <span className='flex flex-col items-center gap-1.5'>
                                        <h2 className='leading-none font-extralight text-lg md:text-xl text-center'>{project.title}</h2>
                                        <Label size='lg' className='text-faint'>{isCurrent ? (isPlaying ? 'Spiller nu' : 'Senest spillet') : project.location}</Label>
                                    </span>
                                </button>
                            )}
                        </SwiperSlide>
                    );
                })}
            </Swiper>
        </div>
    );
}
