
// Format dates to danish layout etc.
export const formatDates = (startStr, endStr) => {
  const options = { day: 'numeric', month: 'long' };
  const formatter = new Intl.DateTimeFormat('da-DK', options);
  const start = new Date(startStr);
  const end = new Date(endStr);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = formatter.format(start);
  const endText = formatter.format(end);

  return sameYear
    ? `${startText} - ${endText} ${end.getFullYear()}`
    : `${startText} ${start.getFullYear()} - ${endText} ${end.getFullYear()}`;
};

// Format partner array to string
export const formatPartners = (partners = []) =>
  partners.length
    ? new Intl.ListFormat('da', {
        style: 'long',
        type: 'conjunction',
      }).format(partners)
    : '';