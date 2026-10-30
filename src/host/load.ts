import type { Cat, Features, Mdn, NewsItem } from '../shared/types';

// Major-Versionen gepinnt: ein Schemawechsel soll nicht stillschweigend die Anzeige leeren
const FEATURES_URL = 'https://cdn.jsdelivr.net/npm/web-features@3/data.json';
const BCD_URL = 'https://cdn.jsdelivr.net/npm/@mdn/browser-compat-data@8/data.json';
const FEEDS: [string, string][] = [
  ['web.dev', 'https://web.dev/feed.xml'],
  ['Chrome', 'https://developer.chrome.com/static/blog/feed.xml'],
  ['WebKit', 'https://webkit.org/feed/'],
  ['Mozilla Hacks', 'https://hacks.mozilla.org/feed/'],
  ['Firefox', 'https://blog.mozilla.org/en/category/firefox/feed/'],
  ['CSS-Tricks', 'https://css-tricks.com/feed/'],
  ['Smashing', 'https://www.smashingmagazine.com/feed/'],
  ['Frontend Focus', 'https://frontendfoc.us/rss'],
  ['JavaScript Weekly', 'https://javascriptweekly.com/rss'],
  ['Frontend Front', 'https://frontendfront.com/feed/stories'],
  ['Vue', 'https://github.com/vuejs/core/releases.atom'],
  ['Nuxt', 'https://github.com/nuxt/nuxt/releases.atom'],
  ['Nuxt Blog', 'https://nuxt.com/blog/rss.xml'],
];
const PER_FEED = 5;
const SHOWN = 24;
const MDN_MS = 7 * 864e5;

const day = (s?: string) =>
  String(s || '')
    .replace(/^≤/, '')
    .slice(0, 10);
const decode = (s: string) =>
  s.replace(/&(#\d+|amp|lt|gt|quot|nbsp);/g, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(+e.slice(1)) : ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' } as Record<string, string>)[e]!,
  );
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? m[1]!.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim() : '';
};
const text = (html: string) =>
  decode(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
const clip = (s: string, n: number) => (/^https?:\/\/\S+$/.test(s) ? '' : s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s);

// ponytail: Regex-Parser, fast-xml-parser falls Feeds brechen
function feedImage(b: string) {
  const m =
    b.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/) ||
    b.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/) ||
    b.match(/<media:(?:thumbnail|content)[^>]*url="([^"]+)"/) ||
    b.match(/<img[^>]+src=["']([^"']+)["']/) ||
    b.match(/&lt;img[^&]*?src=(?:"|&quot;)([^"&]+)/);
  const url = m ? decode(m[1]!) : '';
  // GitHub-Release-Feeds liefern nur das Avatar des Autors als media:thumbnail
  return url.startsWith('https:') && !url.includes('avatars.githubusercontent.com') ? url : '';
}

const PRERELEASE = /^v?\d+\.\d+\.\d+-/;
const BARE_VERSION = /^v?\d+(\.\d+)+$/;

export function parseFeed(xml: string, source: string): NewsItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  return blocks
    .map((b) => {
      const href = b.match(/<link[^>]*href="([^"]+)"/);
      const date = text(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published'));
      const title = text(tag(b, 'title'));
      return {
        source,
        // Release-Feeds: "v3.5.22" -> "Vue v3.5.22"
        title: BARE_VERSION.test(title) ? `${source} ${title}` : title,
        link: href ? href[1]! : text(tag(b, 'link')),
        date: date ? new Date(date).getTime() || 0 : 0,
        desc: clip(text(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded')), 220),
        image: feedImage(b),
      };
    })
    .filter((i) => i.title && /^https?:/.test(i.link) && !PRERELEASE.test(i.title))
    .slice(0, PER_FEED);
}

function category(key = ''): Cat {
  if (key.startsWith('css.')) return 'CSS';
  if (key.startsWith('html.')) return 'HTML';
  if (key.startsWith('javascript.') || key.startsWith('api.')) return 'JS';
  return 'Sonstige';
}

interface RawFeatures {
  features: Record<
    string,
    {
      kind: string;
      name: string;
      description?: string;
      compat_features?: string[];
      status?: { baseline: string | false; baseline_low_date?: string; baseline_high_date?: string };
    }
  >;
}

export function parseFeatures(data: RawFeatures): Features {
  if (!data || typeof data.features !== 'object' || !data.features) throw new Error('web-features: unerwartetes Format');
  const all = Object.entries(data.features)
    .filter(([, f]) => f.kind === 'feature' && f.status)
    .map(([id, f]) => ({
      id,
      name: f.name,
      desc: f.description || '',
      cat: category((f.compat_features || [])[0]),
      level: String(f.status!.baseline),
      low: day(f.status!.baseline_low_date),
      high: day(f.status!.baseline_high_date),
    }));
  return {
    newly: all.filter((f) => f.level === 'low').sort((a, b) => b.low.localeCompare(a.low)),
    widely: all.filter((f) => f.level === 'high').sort((a, b) => b.high.localeCompare(a.high)),
  };
}

const get = async (url: string, ms = 15000) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r;
};

// MDN-URL pro Feature: erste Compat-Key mit mdn_url aus den Browser-Compat-Daten (~20 MB, daher 7 Tage gecacht)
async function loadMdn(raw: RawFeatures): Promise<Mdn> {
  const bcd = await get(BCD_URL, 90000).then((r) => r.json());
  const map: Record<string, string> = {};
  for (const [id, f] of Object.entries(raw.features)) {
    if (f.kind !== 'feature') continue;
    for (const key of f.compat_features || []) {
      const url = key.split('.').reduce((o: any, p) => o && o[p], bcd)?.__compat?.mdn_url;
      if (url) {
        map[id] = url;
        break;
      }
    }
  }
  return { at: Date.now(), map };
}

// Feed-Links sind fremde Eingaben und die Extension kann im Remote-/Container-Host laufen: nur öffentliche https-Ziele abrufen.
// ponytail: nur Hostname-Prüfung (kein DNS-Check), bei Bedarf Namen vor dem Fetch auflösen und die IP prüfen
const PRIVATE_HOST = /^(localhost|\[|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.(local|internal|localhost)$/i;
export function isPublicHttps(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !PRIVATE_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

// Redirects einzeln prüfen, statt sie fetch blind folgen zu lassen
async function getPublic(url: string, ms: number) {
  for (let hops = 0; hops < 4; hops++) {
    if (!isPublicHttps(url)) throw new Error(`${url}: blockiert`);
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), redirect: 'manual' });
    const next = r.status >= 300 && r.status < 400 && r.headers.get('location');
    if (!next) return r;
    url = new URL(next, url).href;
  }
  throw new Error(`${url}: zu viele Weiterleitungen`);
}

// Nur bis </head> (max. 200 kB) lesen, dann Verbindung abbrechen
async function readHead(r: Response) {
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let html = '';
  for (let c = await reader.read(); !c.done; c = await reader.read()) {
    html += dec.decode(c.value, { stream: true });
    if (html.length > 200000 || /<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

async function addOgImages(items: NewsItem[]) {
  await Promise.all(
    items
      .filter((i) => !i.image)
      .map(async (i) => {
        try {
          const html = await readHead(await getPublic(i.link, 8000));
          const meta = html.match(/<meta[^>]+og:image(?!:)[^>]*>/i);
          const src = meta && meta[0].match(/content=["']([^"']+)["']/i);
          const url = src && new URL(decode(src[1]!), i.link).href;
          if (url && url.startsWith('https:')) i.image = url;
        } catch {
          /* kein Bild */
        }
      }),
  );
}

export async function load(prevMdn?: Mdn) {
  const feedsP = Promise.allSettled(
    FEEDS.map(([name, url]) =>
      get(url)
        .then((r) => r.text())
        .then((x) => parseFeed(x, name)),
    ),
  );
  let features: Features | null = null;
  let mdn = prevMdn;
  try {
    const raw: RawFeatures = await get(FEATURES_URL).then((r) => r.json());
    features = parseFeatures(raw);
    if (!mdn || Date.now() - mdn.at > MDN_MS) mdn = await loadMdn(raw).catch(() => prevMdn);
  } catch {
    /* features bleibt null */
  }
  const feeds = await feedsP;
  const seen = new Set<string>();
  const news = feeds
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => b.date - a.date)
    .filter((n) => !seen.has(n.title.toLowerCase()) && seen.add(n.title.toLowerCase()))
    .slice(0, SHOWN);
  await addOgImages(news);
  return { features, news, mdn, failed: FEEDS.filter((_, i) => feeds[i]!.status === 'rejected').map(([n]) => n) };
}
