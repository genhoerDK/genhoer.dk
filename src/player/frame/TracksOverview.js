'use client';

/**
 * The works (?lyt=vaerker): a row of round covers to swipe through, starting at the work that
 * plays. A click on a cover to the side brings it to the middle; a click on the one in the middle
 * plays it and closes the overview — or, when it is the work that plays, pauses it (the button
 * shows pause then, like the other play buttons). Mouse wheel and ←/→ move it too.
 */

import 'swiper/css';
import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import { PlayIcon, PauseIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/player/AudioContext';
import Label from '@/components/UI/Label';

export default function TracksOverview({ toggleOverview }) {
    const { projectsWithAudio, play, pause, currentTrack, isPlaying } = useAudio();
    const swiperRef = useRef(null);
    const start = Math.max(0, projectsWithAudio.findIndex((p) => p.slug === currentTrack?.slug));
    const playingSlug = isPlaying ? currentTrack?.slug : null;

    const handleClick = (project, i) => {
        const swiper = swiperRef.current;
        if (swiper && swiper.activeIndex !== i) return swiper.slideTo(i);
        if (project.slug === playingSlug) return pause();
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
                    const playing = project.slug === playingSlug;
                    return (
                        <SwiperSlide key={project.slug} className='!w-56 md:!w-72'>
                            {({ isActive }) => (
                                <button
                                    onClick={() => handleClick(project, i)}
                                    aria-label={isActive ? (playing ? `Pause ${project.title}` : `Afspil ${project.title}`) : project.title}
                                    className={`flex flex-col items-center gap-4 w-full cursor-pointer transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40 md:hover:opacity-70'}`}
                                >
                                    <span className={`relative block size-48 md:size-64 rounded-full overflow-hidden transition-shadow duration-300 ${isActive ? 'ring-1 ring-paper/70' : ''}`}>
                                        <img src={project.coverImageSmall} alt='' className='size-full object-cover grayscale' draggable={false} />
                                        {isActive && (
                                            <span className='absolute inset-0 flex items-center justify-center'>
                                                <span className='flex items-center justify-center size-16 rounded-full bg-paper text-ink'>
                                                    {playing ? <PauseIcon className='size-7' /> : <PlayIcon className='size-7 ml-0.5' />}
                                                </span>
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
