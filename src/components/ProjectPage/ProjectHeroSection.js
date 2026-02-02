"use client";

import { useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import { formatDates } from "@/utilities/formatDates";
import BackgroundImage from '@/components/BackgroundImage';
import ProjectDescription from '@/components/ProjectPage/ProjectDescription';
import ProjectPlayButton from '@/components/ProjectPage/ProjectPlayButton';
import ProjectSponsors from '@/components/ProjectPage/ProjectSponsors';

export default function ProjectHeroSection({ project }) {
    const { initialized, setTrack, currentTrack, play, pause, isPlaying } = useAudio();
    const { title, slug, startDate, endDate, location, partners, description, audio, sponsorLogos } = project;
    const isProjectPlaying = isPlaying && currentTrack?.slug === slug;
    const hasAudio = !!audio;

    useEffect(() => {
        if (!isPlaying && !initialized && hasAudio) setTrack(project);
    }, [project, setTrack, isPlaying, initialized, hasAudio]);

    const togglePlayback = () => {
        if (!hasAudio) return;
        isProjectPlaying ? pause() : play(project);
    };

    const info = [
        { label: "Udstilling", value: formatDates(startDate, endDate) },
        { label: "Lokalitet", value: location },
        { label: "Partnere", value: partners },
    ]

    return (
        <section className='relative text-paper overflow-hidden pointer-events-none'>
            <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />
            <ProjectDescription title={title} text={description} info={info}>
                <ProjectPlayButton active={hasAudio} playing={isProjectPlaying} togglePlayback={togglePlayback}/>
            </ProjectDescription>
            <ProjectSponsors logos={sponsorLogos} />
        </section>
    );
}