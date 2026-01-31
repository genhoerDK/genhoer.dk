import Title from "@/components/TitleSmall";
import Link from "next/link";
import CardMedia from "@/components/ProjectGrid/CardMedia";
import ProjectStatus from "@/components/ProjectGrid/ProjectStatus";
import InfoList from "@/components/InfoList";
import { formatDates } from '@/utilities/formatDates';

export default function ProjectCard({ project }) {
    const { title, slug, coverVideo, coverImageSmall, startDate, endDate, location, partners } = project;
    const info = [
        { label: "Udstilling", value: formatDates(startDate, endDate) },
        { label: "Lokalitet", value: location },
        { label: "Partnere", value: partners },
    ]

    return (
        <li>
            <Title>{title}</Title>
            <Link href={slug}>
                <CardMedia vid={coverVideo} img={coverImageSmall} alt={title}>
                    <ProjectStatus startDate={startDate} endDate={endDate} />
                </CardMedia>
            </Link>
            <InfoList items={info} />
        </li>
    );
}