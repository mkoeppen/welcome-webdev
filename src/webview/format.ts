const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

export const when = (t: number) => {
  if (!t) return '';
  const h = (Date.now() - t) / 36e5;
  if (h < 1) return 'gerade eben';
  if (h < 24) return rtf.format(-Math.round(h), 'hour');
  if (h < 24 * 7) return rtf.format(-Math.round(h / 24), 'day');
  return new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
};

export const fdate = (s: string) =>
  new Date(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s);
