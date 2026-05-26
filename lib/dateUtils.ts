export function parseLocalDate(d: string | Date | undefined): Date {
  if (!d) return new Date();
  const s = typeof d === 'string' ? d : d.toISOString();
  const [y, m, day] = s.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}
