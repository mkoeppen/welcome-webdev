import { expect, test } from 'vite-plus/test';
import { applyMarks } from './marks';

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
