import { expect, test } from 'vite-plus/test';
import { applyMarks, pruneMarks, pruneSaved, saveFavs } from './marks';

test('pruneMarks: verwirft alte News-Markierungen, behält Favoriten und Features', () => {
  const m = { 'n:a': { read: 1 as const }, 'n:b': { fav: 1 as const }, 'n:c': { read: 1 as const }, 'f:x': { read: 1 as const } };
  expect(Object.keys(pruneMarks(m, new Set(['n:c']))).sort()).toEqual(['f:x', 'n:b', 'n:c']);
});

test('setzt und kombiniert Markierungen', () => {
  let m = applyMarks({}, ['f:a', 'n:b'], { read: 1 });
  m = applyMarks(m, ['f:a'], { fav: 1, hidden: 1 });
  expect(m['f:a']).toEqual({ read: 1, fav: 1, hidden: 1 });
});

test('read:0 bleibt, fav/hidden werden gelöscht', () => {
  let m = applyMarks({}, ['f:a'], { read: 1, fav: 1, hidden: 1 });
  m = applyMarks(m, ['f:a'], { fav: 0, hidden: 0, read: 0 });
  expect(m['f:a']).toEqual({ read: 0 });
});

test('leere Markierungen entfallen', () => {
  expect(applyMarks({ x: { fav: 1 } }, ['x'], { fav: 0 })).toEqual({});
});

test('mutiert die Eingabe nicht', () => {
  const m = { x: { fav: 1 as const } };
  applyMarks(m, ['x'], { fav: 0 });
  expect(m).toEqual({ x: { fav: 1 } });
});

const item = (link: string) => ({ source: 's', title: link, link, date: 1, desc: '', image: '' });

test('saveFavs: merkt nur Meldungen mit passendem Key, behält bestehende', () => {
  const saved = saveFavs({ old: item('old') }, [item('a'), item('b')], ['n:b', 'f:x']);
  expect(Object.keys(saved).sort()).toEqual(['b', 'old']);
});

test('pruneSaved: behält nur Schnappschüsse mit Favoriten-Markierung', () => {
  const saved = { a: item('a'), b: item('b') };
  expect(Object.keys(pruneSaved(saved, { 'n:a': { fav: 1 }, 'n:b': { read: 1 } }))).toEqual(['a']);
});
