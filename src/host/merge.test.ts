import { expect, test } from 'vite-plus/test';
import { CACHE_MS, due, FEATURES_FAILED, merge, oldest, RETRY_MS } from './merge';
import type { Cache } from './merge';

const news = [{ source: 's', title: 't', link: 'https://x', date: 1, desc: '', image: '' }];
const features = { newly: [], widely: [] };
const old: Cache = { at: 1, newsAt: 1, featuresAt: 1, data: { features, news: [], failed: [] } };

test('merge: nur News erreichbar -> persistiert, Features aus altem Cache und als veraltet gemeldet', () => {
  const r = merge(old, { features: null, news, failed: [] }, 5);
  expect(r).toMatchObject({
    persist: true,
    cache: { at: 5, newsAt: 5, featuresAt: 1, data: { features, news, failed: [FEATURES_FAILED] } },
  });
});

test('merge: nur Features erreichbar -> News aus altem Cache, newsAt bleibt alt', () => {
  const r = merge({ ...old, data: { ...old.data, news } }, { features, news: [], failed: ['x'] }, 5);
  expect(r.cache.data.news).toBe(news);
  expect(r.cache).toMatchObject({ newsAt: 1, featuresAt: 5 });
  expect(r.persist).toBe(true);
});

test('merge: ohne alten Cache gibt es keine Veraltet-Meldung für fehlende Features', () => {
  expect(merge(undefined, { features: null, news, failed: [] }, 5).cache.data.failed).toEqual([]);
});

test('merge: komplett offline -> alter Stand, nichts persistiert', () => {
  expect(merge(old, { features: null, news: [], failed: ['x'] })).toEqual({ cache: old, persist: false });
  expect(merge(undefined, { features: null, news: [], failed: ['x'] }).persist).toBe(false);
});

test('due: 6 h im Normalfall, 15 min nach Teilausfall', () => {
  expect(due(old, 1 + CACHE_MS)).toBe(false);
  expect(due(old, 2 + CACHE_MS)).toBe(true);
  const partial = { ...old, data: { ...old.data, failed: ['x'] } };
  expect(due(partial, 1 + RETRY_MS)).toBe(false);
  expect(due(partial, 2 + RETRY_MS)).toBe(true);
});

test('oldest: ältester Teil zählt, Features nur wenn vorhanden, Altformat fällt auf at zurück', () => {
  expect(oldest({ ...old, newsAt: 9, featuresAt: 4 })).toBe(4);
  expect(oldest({ ...old, newsAt: 9, featuresAt: 4, data: { ...old.data, features: null } })).toBe(9);
  expect(oldest({ at: 7, data: old.data } as Cache)).toBe(7);
});
