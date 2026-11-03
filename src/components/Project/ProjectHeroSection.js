"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/context/AudioContext';
import { settingsFor } from '@/components/Player/interfaces/registry';
import { getProjectInfo } from "@/utilities/projectInfo";
import BackgroundImage from '@/components/Layout/BackgroundImage';
import ProjectDescription from '@/components/Project/ProjectDescription';
import ProjectPlayButton from '@/components/Project/ProjectPlayButton';
import ProjectSponsors from '@/components/Project/ProjectSponsors';

export default function ProjectHeroSection({ project }) {
    const { initialized, setTrack, currentTrack, play, pause, isPlaying } = useAudio();
    const { title, slug, description, player, sponsorLogos } = project;
    const isProjectPlaying = isPlaying && currentTrack?.slug === slug;
    const hasAudio = !!player;
    const router = useRouter();

    useEffect(() => {
        if (!isPlaying && !initialized && hasAudio) setTrack(project);
    }, [project, setTrack, isPlaying, initialized, hasAudio]);

    const togglePlayback = () => {
        if (!hasAudio) return;
        if (isProjectPlaying) return pause();
        play(project);
        // A work that is played with its interface (buttons, a walk …) opens the player
        if (settingsFor(project).opens) router.replace('?lyt', { scroll: false });
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