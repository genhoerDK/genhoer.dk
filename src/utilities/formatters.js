import { format, isSameDay, isAfter, isBefore, parseISO, differenceInCalendarDays, differenceInCalendarMonths, isWithinInterval, startOfWeek, endOfWeek, addDays, getMonth, getYear } from 'date-fns';
import { da } from 'date-fns/locale';

////////////////////////////////////////////
//// Format dates to danish layout etc. ////
////////////////////////////////////////////

export const formatDates = (startStr, endStr) => {
  const start = parseISO(startStr);

  // If end date is null -> permanent installation
  if (!endStr) {
    const startText = format(start, 'd. MMMM', { locale: da });
    return `${startText} ${start.getFullYear()} (permanent)`;
  }

  const end = parseISO(endStr);
  const sameYear = start.getFullYear() === end.getFullYear();

  const startText = format(start, 'd. MMMM', { locale: da });
  const endText = format(end, 'd. MMMM', { locale: da });

  return sameYear
    ? `${startText} - ${endText} ${end.getFullYear()}`
    : `${startText} ${start.getFullYear()} - ${endText} ${end.getFullYear()}`;
};

///////////////////////////////
//// Format project status ////
///////////////////////////////

export function formatStatus(startDate, endDate, today = new Date()) {
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : null;

  // Hvis vi HAR en endDate, kan vi vise "lukker..." og "kan opleves nu"
  if (end) {
    if (isSameDay(today, start)) return 'åbner i dag';
    if (isSameDay(today, end)) return 'lukker i dag';

    if (isAfter(today, start) && isBefore(today, end)) return 'kan opleves nu';
    if (!isBefore(today, start)) return null;
  } else {
    // Hvis vi IKKE har en endDate (permanent installation):
    // Vi viser kun "åbner..." frem til startdatoen, og ellers ingenting bagefter
    if (isSameDay(today, start)) return 'åbner i dag';
    if (!isBefore(today, start)) return null;
  }

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

  const seasons = [
    'vinter', 'vinter', 'foråret', 'foråret', 'foråret', 'sommer',
    'sommer', 'sommer', 'efteråret', 'efteråret', 'efteråret', 'vinter'
  ];

  const season = seasons[getMonth(start)];
  return `åbner til ${season}${startYear !== currentYear ? ` ${startYear}` : ''}`;
}