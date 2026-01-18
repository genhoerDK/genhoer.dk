"use client";

import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel } from 'swiper/modules';

import { useState } from 'react';

import { useAudio } from '@/context/AudioContext';
import { useSearchParams } from 'next/navigation';
import { XMarkIcon, RectangleGroupIcon, PlayCircleIcon, PauseCircleIcon, ForwardIcon, BackwardIcon, ListBulletIcon, MusicalNoteIcon } from '@heroicons/react/20/solid';
import PlayerScrubber from '@/components/Player/PlayerScrubber';
import LabelLarge from '@/components/LabelLarge';

export default function Player() {
    const { projectsWithAudio, play, pause, isPlaying, currentTrack } = useAudio();
    const searchParams = useSearchParams();
    const isOpen = searchParams.has('lyt');

    const [tracksIsOpen, setTracksIsOpen] = useState(false);
    const [sectionsIsOpen, setSectionsIsOpen] = useState(false);

    const togglePlayback = () => {
        isPlaying ? pause() : play();
    }

    const toggleTracksOverview = () => {
        setTracksIsOpen(prev => !prev);
        setSectionsIsOpen(false);
    }

    const toggleSectionsView = () => {
        setSectionsIsOpen(prev => !prev);
        setTracksIsOpen(false);
    }
    
    return (
        <article className={`fixed inset-0 w-screen h-dvh bg-zinc-50 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <section className='relative flex flex-col items-center size-full overflow-hidden'>
                
                <figure className="absolute inset-0 size-full"> 
                    <video src={null} playsInline muted autoPlay loop className="object-cover size-full" />
                </figure>


                {tracksIsOpen &&
                <div className="absolute inset-0 flex items-center size-full bg-amber-50">
                    <Swiper
                        modules={[Mousewheel]}
                        mousewheel={{ forceToAxis: true, sensitivity: 0.5 }}
                        spaceBetween={48}
                        slidesPerView={'auto'}
                        centeredSlides={true}
                        className='w-full'
                    >
                        {projectsWithAudio.map((project, i) => (
                            <SwiperSlide key={i} className="!w-64 flex justify-center">
                                <img
                                    src={project.artwork}
                                    alt={project.title}
                                    className="size-64 object-cover"
                                    loading="lazy"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
                }
                
                <div className="absolute inset-x-0 bottom-10 md:bottom-0 flex flex-col justify-end items-center p-10 h-full text-zinc-50 bg-gradient-to-t from-zinc-900/100 to-zinc-50/0">
                    {!tracksIsOpen &&
                    <>
                    {!sectionsIsOpen &&
                    <div className="flex gap-4 pb-8">
                        <figure>
                            <img src={currentTrack.artwork} alt={currentTrack.title} className="size-14 object-cover" loading="lazy" />
                        </figure>
                        <div className="flex flex-col justify-center gap-1">
                            <h2 className="uppercase font-light text-lg md:text-xl leading-none">{currentTrack.title}</h2>
                            <p className="text-xs uppercase leading-none pointer-events-none text-zinc-50/50">{currentTrack.location}</p>
                        </div>
                    </div>
                    }
                    <PlayerScrubber sectionsIsOpen={sectionsIsOpen} />

                    </>
                    }

                    <div className="flex items-center justify-between w-full max-w-md pt-4">
                        <button onClick={toggleSectionsView} className='flex items-center justify-center gap-1 w-26 h-8 rounded-full bg-zinc-50 text-zinc-800 cursor-pointer'>
                            {sectionsIsOpen ? <XMarkIcon className="size-5" /> : <RectangleGroupIcon className="size-5" /> }
                            <LabelLarge>Afsnit</LabelLarge>
                        </button>
                        <div className="flex items-center gap-4">
                            <BackwardIcon className="size-8" />
                            <button onClick={togglePlayback} className=" cursor-pointer">
                                {isPlaying ? <PauseCircleIcon className="size-16" /> : <PlayCircleIcon className="size-16" />}
                            </button>
                            <ForwardIcon className="size-8" />
                        </div>
                        <button onClick={toggleTracksOverview} className='flex items-center justify-center gap-1 w-26 h-8 rounded-full bg-zinc-50 text-zinc-800 cursor-pointer'>
                            {tracksIsOpen ? <XMarkIcon className="size-5" /> : <MusicalNoteIcon className="size-5" /> }
                            <LabelLarge>Værker</LabelLarge>
                        </button>
                    </div>
                </div>

                

                
                
            </section>
        </article>
    );
}