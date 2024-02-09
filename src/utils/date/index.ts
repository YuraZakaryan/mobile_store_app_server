export const formatDate = (inputDate: Date, timeZoneString?: string) => {
  const originalDate = new Date(inputDate);

  if (isNaN(originalDate.getTime())) {
    console.error('Invalid date:', inputDate);
    return '';
  }

  const timeZone: string =
    timeZoneString || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone,
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', options).format(
    originalDate,
  );

  const day = originalDate.getDate().toString().padStart(2, '0');
  const month = (originalDate.getMonth() + 1).toString().padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
  const year = originalDate.getFullYear();

  return `${day} / ${month} / ${year}  ${formattedTime}`;
};
