"use client";

import { useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import { getProjectInfo } from "@/utilities/projectInfo";
import BackgroundImage from '@/components/Layout/BackgroundImage';
import ProjectDescription from '@/components/Project/ProjectDescription';
import ProjectPlayButton from '@/components/Project/ProjectPlayButton';
import ProjectSponsors from '@/components/Project/ProjectSponsors';

export default function ProjectHeroSection({ project }) {
    const { initialized, setTrack, currentTrack, play, pause, isPlaying } = useAudio();
    const { title, slug, description, audio, sponsorLogos } = project;
    const isProjectPlaying = isPlaying && currentTrack?.slug === slug;
    const hasAudio = !!audio;

    useEffect(() => {
        if (!isPlaying && !initialized && hasAudio) setTrack(project);
    }, [project, setTrack, isPlaying, initialized, hasAudio]);

    const togglePlayback = () => {
        if (!hasAudio) return;
        isProjectPlaying ? pause() : play(project);
    };

    return (
        <section className='relative bg-ink text-paper overflow-hidden pointer-events-none'>
            <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />
            <ProjectDescription title={title} text={description} info={getProjectInfo(project)}>
                <ProjectPlayButton active={hasAudio} playing={isProjectPlaying} togglePlayback={togglePlayback}/>
            </ProjectDescription>
            <ProjectSponsors logos={sponsorLogos} />
        </section>
    );
}