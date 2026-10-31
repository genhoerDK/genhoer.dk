'use client';

import { PlayIcon } from '@heroicons/react/20/solid';
import { useAudio } from '@/context/AudioContext';
import Label from '@/components/UI/Label';

/** The other works with sound, as a row that slides up over the scene */
export default function WorksDrawer({ open, onClose }) {
    const { projectsWithAudio, currentTrack, play } = useAudio();

    return (
        <div className={`absolute inset-x-0 bottom-0 pb-28 md:pb-20 pt-10 bg-linear-to-t from-paper via-paper/95 to-transparent transition-all duration-500 ${open ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
            <div className="flex gap-4 md:gap-6 overflow-x-auto px-gutter pb-2 snap-x">
                {projectsWithAudio.map((project) => {
                    const isCurrent = project.slug === currentTrack?.slug;
                    return (
                        <button
                            key={project.slug}
                            onClick={() => { play(project); onClose(); }}
                            className="group shrink-0 w-32 md:w-40 snap-start text-left cursor-pointer"
                        >
                            <div className={`relative aspect-square rounded-full overflow-hidden bg-soft ${isCurrent ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}`}>
                                <img src={project.coverImageSmall} alt="" loading="lazy" className="size-full object-cover transition md:group-hover:scale-105" />
                                <PlayIcon className="absolute inset-0 m-auto size-8 text-paper opacity-0 md:group-hover:opacity-100 transition" />
                            </div>
                            <Label size="lg" className="mt-3 text-center truncate">{project.title}</Label>
                            <Label className="mt-1 text-center text-hard truncate">{project.location}</Label>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
