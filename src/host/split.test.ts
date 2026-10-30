import { expect, test } from 'vite-plus/test';
import type { Feature } from '../shared/types';
import { split } from './split';

const f = (id: string, low: string, high = ''): Feature => ({ id, name: id, desc: '', cat: 'CSS', level: 'low', low, high });
const NOW = Date.parse('2026-10-30');

test('teilt nach 365-Tage-Fenster', () => {
  const s = split(
    {
      newly: [f('a', '2026-09-01'), f('b', '2025-01-01')],
      widely: [f('c', '2023-05-01', '2026-06-01'), f('d', '2021-01-01', '2024-01-01')],
    },
    NOW,
  );
  expect(s.newlyRecent.map((x) => x.id)).toEqual(['a']);
  expect(s.newlyOlder.map((x) => x.id)).toEqual(['b']);
  expect(s.widelyRecent.map((x) => x.id)).toEqual(['c']);
  expect(s.widelyOlder.map((x) => x.id)).toEqual(['d']);
});
