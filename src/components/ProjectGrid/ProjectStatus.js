import { formatStatus } from "@/utilities/formatters";
import LabelSmall from "@/components/LabelSmall";

export default function ProjectStatus({ startDate, endDate }) {
  const status = formatStatus(startDate, endDate);
  if (!status) return null;

  return (
    <div className="absolute top-0 right-0 px-2 py-1.75 bg-zinc-700 text-zinc-200 pointer-events-none">
      <LabelSmall>{status}</LabelSmall>
    </div>
  );
}