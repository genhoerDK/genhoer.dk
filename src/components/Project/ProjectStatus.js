"use client";

import { useToday } from "@/hooks/useToday";
import { formatProjectStatus } from "@/utilities/formatProjectStatus";
import Label from "@/components/UI/Label";

export default function ProjectStatus({ startDate, endDate }) {
    const today = useToday();
    const status = formatProjectStatus(startDate, endDate, today);

    if (!status) return null;

    return (
        <figcaption className="absolute top-0 right-0 px-2 py-1.5 bg-ink text-paper pointer-events-none">
            <Label>{status}</Label>
        </figcaption>
    );
}
