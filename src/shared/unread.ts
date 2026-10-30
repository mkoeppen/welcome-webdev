import type { Feature, Marks, NewsItem, SplitFeatures } from './types';

export const newsKey = (link: string) => `n:${link}`;
export const featKey = (id: string) => `f:${id}`;

// Features außerhalb des 365-Tage-Fensters (old) gelten ohne eigene Markierung als gelesen
export function isRead(marks: Marks, key: string, old = false) {
  const m = marks[key];
  return m?.read === 1 || (m?.read === undefined && old);
}

// Ungelesen und nicht ausgeblendet. Läuft in der Extension (Statusleiste/Badge) und in der Webview.
export function countUnread(news: NewsItem[], features: SplitFeatures | null, marks: Marks) {
  const unread = (key: string, old = false) => !marks[key]?.hidden && !isRead(marks, key, old);
  const feats = (recent: Feature[], older: Feature[]) =>
    recent.filter((f) => unread(featKey(f.id))).length + older.filter((f) => unread(featKey(f.id), true)).length;
  const newly = features ? feats(features.newlyRecent, features.newlyOlder) : 0;
  const widely = features ? feats(features.widelyRecent, features.widelyOlder) : 0;
  return { news: news.filter((n) => unread(newsKey(n.link))).length, newly, widely };
}
