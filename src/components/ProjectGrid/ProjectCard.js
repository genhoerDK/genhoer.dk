import Link from "next/link";
import CardTitle from "@/components/ProjectGrid/CardTitle";
import CardMedia from "@/components/ProjectGrid/CardMedia";
import ProjectStatus from "@/components/ProjectGrid/ProjectStatus";
import InfoRow from "@/components/InfoRow";

import { formatDates } from '@/utilities/formatters';

export default function ProjectCard({ project }) {
    return (
        <li className="bg-zinc-50"> 
            <CardTitle>{project.title}</CardTitle>
            <Link href={project.slug}>
                <div className="relative">
                    <CardMedia alt={project.title} img={project.coverImageSmall} vid={project.coverVideo} />
                    <ProjectStatus startDate={project.startDate} endDate={project.endDate} />
                </div>
            </Link>
            <InfoRow label="Udstilling">{formatDates(project.startDate, project.endDate)}</InfoRow>
            <InfoRow label="Lokalitet">{project.location}</InfoRow>
            <InfoRow label="Partnere">{project.partners}</InfoRow>
        </li>
    );
}