////////////////////////////////////////////
//// Format dates to danish layout etc. ////
////////////////////////////////////////////

import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

export const formatDates = (startStr, endStr) => {
  const start = parseISO(startStr);

  // If end date is null = permanent installation
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