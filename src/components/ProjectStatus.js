import { formatStatus } from '@/utilities/formatters';

export default function ProjectStatus({ startDate, endDate }) {
  const status = formatStatus(startDate, endDate);

  if (!status) return null;

  return (
    <div className="absolute right-0 p-1.5 bg-zinc-700 text-zinc-200">
      <p className="text-[0.5rem] uppercase leading-none">{status}</p>
    </div>
  );
}