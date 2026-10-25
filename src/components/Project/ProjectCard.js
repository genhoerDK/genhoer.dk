import Link from "next/link";
import Title from "@/components/UI/Title";
import InfoList from "@/components/UI/InfoList";
import CardMedia from "@/components/Project/CardMedia";
import ProjectStatus from "@/components/Project/ProjectStatus";
import { getProjectInfo } from "@/utilities/projectInfo";

export default function ProjectCard({ project }) {
    const { title, slug, coverVideo, coverImageSmall, startDate, endDate } = project;

    return (
        <li className="cursor-pointer">
            <Title>{title}</Title>
            <Link href={slug}>
                <CardMedia vid={coverVideo} img={coverImageSmall} alt={title}>
                    <ProjectStatus startDate={startDate} endDate={endDate} />
                </CardMedia>
            </Link>
            <InfoList items={getProjectInfo(project)} />
        </li>
    );
}
