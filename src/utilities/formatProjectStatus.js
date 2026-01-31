///////////////////////////////
//// Format project status ////
///////////////////////////////

import { format, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";
import { da } from "date-fns/locale";

export function formatProjectStatus(startDate, endDate, today = new Date()) {
  const start = startOfDay(parseISO(startDate));
  const end = endDate && startOfDay(parseISO(endDate));
  const now = startOfDay(today);

  const daysUntilOpening = differenceInCalendarDays(start, now);

  if (daysUntilOpening > 0) {
    if (daysUntilOpening > 31) {
      return `Åbner til ${format(start, "LLLL", { locale: da })}`;
    }
    if (daysUntilOpening === 2) return "Åbner i overmorgen";
    if (daysUntilOpening === 1) return "Åbner i morgen";
    return `Åbner om ${daysUntilOpening} dage`;
  }

  if (daysUntilOpening === 0) return "Åbner i dag";

  if (!end) return null;

  if (now > end) return null;

  return "Kan opleves nu";
}