import { formatDates } from "@/utilities/formatters";
import InfoRow from "@/components/InfoRow";

export default function MapInfo({ isVisible, project }) {
    return (
        <div className={`absolute top-12 md:top-14 left-0 w-md max-w-full pointer-events-none transition-transform duration-500 ${isVisible ? "translate-x-0" : "-translate-x-full"}`}>
            {!!project &&
            <div className="flex flex-col gap-1 pl-2 md:pl-4 text-zinc-50">
                <h2 className="font-light text-lg md:text-xl uppercase whitespace-nowrap">{project.title}</h2>
                <div className="p-0.5">
                    <InfoRow label="Udstilling">{formatDates(project.startDate, project.endDate)}</InfoRow>
                    <InfoRow label="Lokalitet">{project.location}</InfoRow>
                    <InfoRow label="Partnere" truncate={false}>{project.partners}</InfoRow>
                </div>
            </div>
            }
        </div>
    );
}