import { describe, expect, test } from 'vite-plus/test';
import { isPublicHttps, load, parseFeatures, parseFeed } from './load';

test('isPublicHttps: nur öffentliche https-Ziele', () => {
  expect(isPublicHttps('https://web.dev/a')).toBe(true);
  for (const u of [
    'http://web.dev',
    'https://localhost/x',
    'https://127.0.0.1',
    'https://10.0.0.5',
    'https://192.168.1.1',
    'https://172.20.0.1',
    'https://[::1]/',
    'https://host.internal',
    'nope',
  ])
    expect(isPublicHttps(u), u).toBe(false);
  expect(isPublicHttps('https://172.32.0.1')).toBe(true);
});

const RSS = `<rss><channel>
<item><title>Eins &amp; zwei</title><link>https://example.com/a</link><pubDate>Mon, 26 Oct 2026 10:00:00 GMT</pubDate>
<description><![CDATA[<p>Hallo <b>Welt</b></p>]]></description><enclosure url="https://example.com/a.png" type="image/png"/></item>
<item><title>Nur URL</title><link>https://example.com/b</link><description>https://example.com/b</description></item>
<item><title>Kaputt</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const ATOM = `<feed><entry><title>Atom</title><link href="https://example.com/c"/><updated>2026-10-01T00:00:00Z</updated>
<summary>Kurz</summary></entry></feed>`;

test('parseFeed: RSS mit Bild, Entities, URL-only-Beschreibung, ungültiger Link', () => {
  const items = parseFeed(RSS, 'T');
  expect(items.map((i) => i.title)).toEqual(['Eins & zwei', 'Nur URL']);
  expect(items[0]).toMatchObject({ desc: 'Hallo Welt', image: 'https://example.com/a.png', source: 'T' });
  expect(items[1]!.desc).toBe('');
});

test('parseFeed: Atom', () => {
  expect(parseFeed(ATOM, 'A')[0]).toMatchObject({ link: 'https://example.com/c', desc: 'Kurz' });
});

const RELEASES = `<feed>${['v3.6.0-rc.2', 'v3.6.0-rc.1', 'v3.5.22']
  .map(
    (t) =>
      `<entry><updated>2026-10-0${t.length % 9}T00:00:00Z</updated><link rel="alternate" href="https://github.com/vuejs/core/releases/tag/${t}"/><title>${t}</title><media:thumbnail url="https://avatars.githubusercontent.com/in/1?s=60"/></entry>`,
  )
  .join('')}</feed>`;

test('parseFeed: Release-Feed ohne Pre-Releases, mit Quelle im Titel, ohne Avatar-Bild', () => {
  const items = parseFeed(RELEASES, 'Vue');
  expect(items.map((i) => i.title)).toEqual(['Vue v3.5.22']);
  expect(items[0]!.image).toBe('');
});

test('parseFeatures: unerwartetes Format wirft, damit "Baseline-Daten nicht erreichbar" erscheint', () => {
  expect(() => parseFeatures({} as never)).toThrow('unerwartetes Format');
  expect(() => parseFeatures(null as never)).toThrow('unerwartetes Format');
});

test('parseFeatures: Kategorien und Sortierung', () => {
  const f = parseFeatures({
    features: {
      a: { kind: 'feature', name: 'A', compat_features: ['css.x'], status: { baseline: 'low', baseline_low_date: '2026-01-01' } },
      b: { kind: 'feature', name: 'B', compat_features: ['api.y'], status: { baseline: 'low', baseline_low_date: '2026-05-01' } },
      c: {
        kind: 'feature',
        name: 'C',
        compat_features: ['html.z'],
        status: { baseline: 'high', baseline_low_date: '≤2020-01-01', baseline_high_date: '≤2022-07-01' },
      },
      d: { kind: 'group', name: 'D' },
    },
  });
  expect(f.newly.map((x) => [x.id, x.cat])).toEqual([
    ['b', 'JS'],
    ['a', 'CSS'],
  ]);
  expect(f.widely[0]).toMatchObject({ id: 'c', cat: 'HTML', high: '2022-07-01' });
});

// Netzwerktest: LIVE=1 vp test run
describe.skipIf(!process.env.LIVE)('live', () => {
  test('lädt Features, News und MDN-Links', async () => {
    const d = await load();
    expect(d.features!.newly.length).toBeGreaterThan(0);
    expect(d.features!.widely.length).toBeGreaterThan(0);
    for (const c of ['CSS', 'HTML', 'JS']) expect([...d.features!.newly, ...d.features!.widely].some((f) => f.cat === c)).toBe(true);
    expect(d.news.length).toBeGreaterThan(0);
    expect(Object.keys(d.mdn!.map).length).toBeGreaterThan(500);
  }, 180000);
});
