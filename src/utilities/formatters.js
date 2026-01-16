import { format, isSameDay, isAfter, isBefore, parseISO, differenceInCalendarDays, differenceInCalendarMonths, isWithinInterval, startOfWeek, endOfWeek, addDays, getMonth, getYear } from 'date-fns';
import { da } from 'date-fns/locale';

////////////////////////////////////////////
//// Format dates to danish layout etc. ////
////////////////////////////////////////////

export const formatDates = (startStr, endStr) => {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const sameYear = start.getFullYear() === end.getFullYear();
  const formatOptions = 'd. MMMM';

  const startText = format(start, formatOptions, { locale: da });
  const endText = format(end, formatOptions, { locale: da });

  return sameYear
    ? `${startText} - ${endText} ${end.getFullYear()}`
    : `${startText} ${start.getFullYear()} - ${endText} ${end.getFullYear()}`;
};

///////////////////////////////
//// Format project status ////
///////////////////////////////

export function formatStatus(startDate, endDate, today = new Date()) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (isSameDay(today, start)) return 'åbner i dag';
  if (isSameDay(today, end)) return 'lukker i dag';

  if (isAfter(today, start) && isBefore(today, end)) return 'kan opleves nu';
  if (!isBefore(today, start)) return null;

  const daysDiff = differenceInCalendarDays(start, today);
  const monthsDiff = differenceInCalendarMonths(start, today);
  const currentYear = getYear(today);
  const startYear = getYear(start);

  if (daysDiff === 1) return 'åbner i morgen';
  if (daysDiff === 2) return 'åbner i overmorgen';

  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekStart = addDays(currentWeekStart, 7);
  const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });

  if (isWithinInterval(start, { start: currentWeekStart, end: currentWeekEnd })) return 'åbner denne uge';
  if (isWithinInterval(start, { start: nextWeekStart, end: nextWeekEnd })) return 'åbner næste uge';

  if (monthsDiff === 0) return 'åbner denne måned';
  if (monthsDiff === 1) return 'åbner næste måned';
  if (monthsDiff <= 3) return `åbner til ${format(start, 'LLLL', { locale: da })}`;

  const seasons = [ 'vinter', 'vinter', 'foråret', 'foråret', 'foråret', 'sommer', 'sommer', 'sommer', 'efteråret', 'efteråret', 'efteråret', 'vinter'];
  const season = seasons[getMonth(start)];
  return `åbner til ${season}${startYear !== currentYear ? ` ${startYear}` : ''}`;
}