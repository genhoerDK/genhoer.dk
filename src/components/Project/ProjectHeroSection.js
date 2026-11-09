"use client";

import { useEffect } from 'react';
import { useAudio } from '@/player/AudioContext';
import { useListen } from '@/player/frame/useListen';
import { getProjectInfo } from "@/utilities/projectInfo";
import BackgroundImage from '@/components/Layout/BackgroundImage';
import ProjectDescription from '@/components/Project/ProjectDescription';
import ProjectPlayButton from '@/components/Project/ProjectPlayButton';
import ProjectSponsors from '@/components/Project/ProjectSponsors';

export default function ProjectHeroSection({ project }) {
    const { initialized, setTrack, currentTrack, pause, isPlaying } = useAudio();
    const { title, slug, description, player, sponsorLogos } = project;
    const isProjectPlaying = isPlaying && currentTrack?.slug === slug;
    const hasAudio = !!player;
    const listen = useListen();

    useEffect(() => {
        if (!isPlaying && !initialized && hasAudio) setTrack(project);
    }, [project, setTrack, isPlaying, initialized, hasAudio]);

    const togglePlayback = () => {
        if (!hasAudio) return;
        if (isProjectPlaying) return pause();
        // Most works start; one played with its interface opens the player; one that only its own
        // buttons start (the elevator, the walk) is only opened (frame/useListen.js)
        listen(project);
    };

    return (
        <section data-header='light' className='relative bg-ink text-paper overflow-hidden pointer-events-none'>
            <BackgroundImage portrait={project.coverImagePortrait} landscape={project.coverImageLandscape} />
            <ProjectDescription title={title} text={description} info={getProjectInfo(project)}>
                <ProjectPlayButton active={hasAudio} playing={isProjectPlaying} togglePlayback={togglePlayback}/>
            </ProjectDescription>
            <ProjectSponsors logos={sponsorLogos} />
        </section>
    );
}