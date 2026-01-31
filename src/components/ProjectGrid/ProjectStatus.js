import { formatProjectStatus } from "@/utilities/formatProjectStatus";
import LabelSmall from "@/components/LabelSmall";

export default function ProjectStatus({ startDate, endDate }) {
    const status = formatProjectStatus(startDate, endDate);
    if (!status) return;

    return (
        <figcaption className="absolute top-0 right-0 px-2 py-1.5 bg-ink text-paper pointer-events-none">
            <LabelSmall>{status}</LabelSmall>
        </figcaption>
    );
}