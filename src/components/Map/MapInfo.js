import { formatDates } from "@/utilities/formatDates";
import Title from "@/components/TitleSmall";
import InfoList from "@/components/InfoList";

export default function MapInfo({ project }) {
    if (!project) return null;
    const { title, startDate, endDate, location, partners } = project;
    const info = [
        { label: "Udstilling", value: formatDates(startDate, endDate) },
        { label: "Lokalitet", value: location },
        { label: "Partnere", value: partners },
    ]

    return (
        <div className="absolute top-11 left-2 flex flex-col gap-2 w-md text-paper pointer-events-none md:left-4">
            <Title>{title}</Title>
            <InfoList items={info} truncate={false} />
        </div>
    );
}