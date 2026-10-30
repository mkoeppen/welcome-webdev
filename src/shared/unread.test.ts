import { expect, test } from 'vite-plus/test';
import { countUnread } from './unread';
import type { Feature, NewsItem } from './types';

const n = (link: string): NewsItem => ({ source: 's', title: link, link, date: 0, desc: '', image: '' });
const f = (id: string): Feature => ({ id, name: id, desc: '', cat: 'CSS', level: 'low', low: '', high: '' });
const features = { newlyRecent: [f('a'), f('b')], newlyOlder: [f('c')], widelyRecent: [f('d')], widelyOlder: [f('e')] };

test('zählt ungelesene, ohne ausgeblendete', () => {
  const c = countUnread([n('x'), n('y')], features, { 'n:x': { read: 1 }, 'f:b': { hidden: 1 } });
  expect(c).toEqual({ news: 1, newly: 1, widely: 1 });
});

test('ältere Features zählen nur mit explizitem read:0', () => {
  expect(countUnread([], features, { 'f:c': { read: 0 } }).newly).toBe(3);
  expect(countUnread([], features, {}).newly).toBe(2);
});

test('ohne Features', () => {
  expect(countUnread([n('x')], null, {})).toEqual({ news: 1, newly: 0, widely: 0 });
});
