import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel } from 'swiper/modules';
import { useAudio } from '@/context/AudioContext';
import { PlayCircleIcon } from '@heroicons/react/20/solid';

export default function TracksOverview({ toggleOverview }) {
    const { projectsWithAudio, play, currentTrack } = useAudio();

    /** Filter out the current track from overview  */
    const filteredProjects = projectsWithAudio.filter(
        (p) => !currentTrack || p.slug !== currentTrack.slug
    );

    /** Handle click on track */
    const handleClick = (track) => {
        play(track);
        toggleOverview();
    }

    return (
        <div className="flex items-center size-full">
            <Swiper
                modules={[Mousewheel]}
                centeredSlides={true}
                slidesPerView={1.5}
                spaceBetween={40}
                grabCursor={true}
                mousewheel={{ forceToAxis: true, sensitivity: 0.5 }}
                breakpoints={{
                  640: { slidesPerView: 1.75, spaceBetween: 50 }, // sm
                  768: { slidesPerView: 2.25, spaceBetween: 60 }, // md
                  1024: { slidesPerView: 2.75, spaceBetween: 70 }, // lg
                  1280: { slidesPerView: 3.25, spaceBetween: 80 }, // xl
                }}
                className='w-full'
            >
                {filteredProjects.map((project, i) => (
                    <SwiperSlide key={i} className="pt-10">
                        <button className="flex items-center justify-center rounded-full overflow-hidden cursor-pointer text-paper" onClick={() => handleClick(project)}>
                            <img src={project.coverImageSmall} alt={project.title} className="object-cover aspect-square" loading="lazy" />
                            <PlayCircleIcon className="absolute inset-auto size-24" />
                        </button>
                        <h2 className="uppercase font-light text-center text-zinc-800 pt-4">{project.title}</h2>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}