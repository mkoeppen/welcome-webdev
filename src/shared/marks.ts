import type { Mark, Marks, NewsItem } from './types';

// Läuft in der Extension UND in der Webview.
// "read: 0" bleibt erhalten (explizit ungelesen), fav/hidden werden bei 0 gelöscht.
export function applyMarks(marks: Marks, keys: string[], patch: Mark): Marks {
  const out = { ...marks };
  for (const k of keys) {
    const m: Record<string, number> = { ...out[k] };
    for (const [p, v] of Object.entries(patch)) {
      if (!v && p !== 'read') delete m[p];
      else m[p] = v;
    }
    if (Object.keys(m).length) out[k] = m as Mark;
    else delete out[k];
  }
  return out;
}

// News-Markierungen für aus dem Feed gefallene Links aufräumen; Favoriten bleiben immer erhalten.
export function pruneMarks(marks: Marks, keep: Set<string>): Marks {
  return Object.fromEntries(Object.entries(marks).filter(([k, m]) => !k.startsWith('n:') || keep.has(k) || m.fav));
}

// Favorisierte News als Schnappschuss merken, damit sie auch nach dem Verschwinden aus dem Feed lesbar bleiben (link -> Meldung)
export type Saved = Record<string, NewsItem>;

export const saveFavs = (saved: Saved, news: NewsItem[], keys: string[]): Saved => ({
  ...saved,
  ...Object.fromEntries(news.filter((n) => keys.includes('n:' + n.link)).map((n) => [n.link, n])),
});

// Schnappschüsse ohne Favoriten-Markierung verwerfen (erst beim Neuaufbau, damit Aus-/Einschalten des Sterns nichts verliert)
export const pruneSaved = (saved: Saved, marks: Marks): Saved =>
  Object.fromEntries(Object.entries(saved).filter(([link]) => marks['n:' + link]?.fav));
