import type { Features, NewsItem } from '../shared/types';

export const CACHE_MS = 6 * 3600e3;
// Nach Teilausfall früher erneut versuchen
export const RETRY_MS = 15 * 60e3;

// at = letzter Ladeversuch mit Ergebnis; newsAt/featuresAt = Zeitpunkt der tatsächlich frischen Daten
export interface Cache {
  at: number;
  newsAt: number;
  featuresAt: number;
  data: { features: Features | null; news: NewsItem[]; failed: string[] };
}

export const FEATURES_FAILED = 'Baseline-Daten';

// Teilausfall (nur Features ODER nur News erreichbar): fehlenden Teil aus dem alten Stand übernehmen und als veraltet melden.
// persist=false bei komplettem Ausfall, damit der nächste Aufruf erneut lädt.
export function merge(cached: Cache | undefined, d: Cache['data'], now = Date.now()): { cache: Cache; persist: boolean } {
  if (!d.features && !d.news.length) return { cache: cached ?? { at: now, newsAt: now, featuresAt: now, data: d }, persist: false };
  const features = d.features ?? cached?.data.features ?? null;
  return {
    cache: {
      at: now,
      newsAt: d.news.length ? now : (cached?.newsAt ?? now),
      featuresAt: d.features ? now : (cached?.featuresAt ?? now),
      data: {
        features,
        news: d.news.length ? d.news : (cached?.data.news ?? []),
        failed: !d.features && features ? [...d.failed, FEATURES_FAILED] : d.failed,
      },
    },
    persist: true,
  };
}

// Neu laden: nach CACHE_MS, bei Teilausfall nach RETRY_MS
export const due = (c: Cache, now = Date.now()) => now - c.at > (c.data.failed.length ? RETRY_MS : CACHE_MS);

// Ältester angezeigter Datenstand ("Stand" in der Kopfzeile); ältere Cache-Dateien ohne newsAt/featuresAt fallen auf `at` zurück
export const oldest = (c: Cache) => Math.min(c.newsAt ?? c.at, c.data.features ? (c.featuresAt ?? c.at) : Infinity);
