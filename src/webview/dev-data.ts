import type { Cat, Feature, Payload } from '../shared/types';

// Fixture für `vp dev` (Browser ohne VS Code), Datumswerte relativ zu heute, damit die 365-Tage-Fenster greifen.
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
const feature = (id: string, cat: Cat, low: number, high = 0): Feature => ({
  id,
  name: id.replace(/-/g, ' '),
  desc: `Beschreibung zu ${id}, ein etwas längerer Text, damit der Zeilenumbruch sichtbar wird.`,
  cat,
  level: high ? 'high' : 'low',
  low: iso(low),
  high: high ? iso(high) : '',
});

const img = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${hue} 60% 45%)"/></svg>`)}`;

export function devPayload(): Payload {
  const now = Date.now();
  const sources = ['web.dev', 'Chrome', 'WebKit', 'Mozilla Hacks', 'CSS-Tricks', 'Smashing'];
  return {
    at: '12:00',
    failed: ['Frontend Front'],
    marks: {},
    mdn: { 'anchor-positioning': 'https://developer.mozilla.org/docs/Web/CSS/anchor' },
    news: sources.concat(sources).map((source, i) => ({
      source,
      title: `Beispielmeldung ${i + 1} von ${source}`,
      link: `https://example.com/news/${i}`,
      date: now - i * 5 * 36e5,
      desc: i % 3 === 2 ? '' : 'Kurzbeschreibung der Meldung, die in der Liste auf zwei Zeilen begrenzt wird, wenn sie zu lang ist.',
      image: i % 2 === 0 ? img(i * 30) : '',
    })),
    features: {
      newlyRecent: [
        feature('anchor-positioning', 'CSS', 20),
        feature('popover', 'HTML', 60),
        feature('array-from-async', 'JS', 120),
        feature('view-transitions', 'CSS', 200),
      ],
      newlyOlder: [feature('subgrid', 'CSS', 500), feature('dialog', 'HTML', 700)],
      widelyRecent: [
        feature('container-queries', 'CSS', 900, 30),
        feature('has', 'CSS', 1000, 90),
        feature('structured-clone', 'JS', 1000, 200),
      ],
      widelyOlder: [feature('flexbox', 'CSS', 3000, 1500), feature('fetch', 'JS', 3000, 1200), feature('details', 'HTML', 2500, 1100)],
    },
  };
}
