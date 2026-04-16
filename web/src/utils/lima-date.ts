const LIMA_TIME_ZONE = 'America/Lima';

export function getCurrentLimaIsoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
