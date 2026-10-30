import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { applyMarks } from '../shared/marks';
import type { Cat, Mark, Marks, Payload, ToWebview } from '../shared/types';
import { countUnread, featKey, isRead as isReadIn, newsKey } from '../shared/unread';
import { vscode } from './vscode';

export type Tab = 'news' | 'feat';
export type Sub = 'newly' | 'widely';
export type Type = 'all' | Cat;

interface View {
  tab: Tab;
  sub: Sub;
  type: Type;
  fav: boolean;
  hid: boolean;
}

export const view = reactive<View>({ tab: 'news', sub: 'newly', type: 'all', fav: false, hid: false, ...vscode.getState<Partial<View>>() });
watch(view, () => vscode.setState({ ...view }));

export const data = shallowRef<Payload | null>(null);
export const marks = ref<Marks>({});

export const loading = ref(false);

export function init() {
  window.addEventListener('message', (e: MessageEvent<ToWebview>) => {
    if (e.data.type === 'data') {
      data.value = e.data.payload;
      marks.value = e.data.payload.marks;
      loading.value = false;
    } else if (e.data.type === 'marks') marks.value = e.data.marks;
  });
  vscode.postMessage({ type: 'ready' });
}

export function refresh() {
  loading.value = true;
  vscode.postMessage({ type: 'refresh' });
}

export function mark(keys: string[], patch: Mark) {
  if (!keys.length) return;
  marks.value = applyMarks(marks.value, keys, patch);
  vscode.postMessage({ type: 'mark', keys, patch });
}

export const isRead = (key: string, old = false) => isReadIn(marks.value, key, old);
export const flags = (key: string, old = false) => ({
  unread: !isRead(key, old),
  fav: !!marks.value[key]?.fav,
  hidden: !!marks.value[key]?.hidden,
});

export const visible = (key: string, cat?: Cat) => {
  const m = marks.value[key];
  return !(m?.hidden && !view.hid) && !(view.fav && !m?.fav) && (view.type === 'all' || !cat || cat === view.type);
};

export { featKey, newsKey };

const featureRows = computed(() => {
  const f = data.value?.features;
  if (!f) return { newly: [], widely: [] };
  return {
    newly: [...f.newlyRecent.map((x) => ({ x, old: false })), ...f.newlyOlder.map((x) => ({ x, old: true }))],
    widely: [...f.widelyRecent.map((x) => ({ x, old: false })), ...f.widelyOlder.map((x) => ({ x, old: true }))],
  };
});

export const unread = computed(() => {
  const c = countUnread(data.value?.news ?? [], data.value?.features ?? null, marks.value);
  return { ...c, feat: c.newly + c.widely };
});

export const hiddenCount = computed(() => {
  const keys = [
    ...(data.value?.news ?? []).map((n) => newsKey(n.link)),
    ...featureRows.value.newly.concat(featureRows.value.widely).map(({ x }) => featKey(x.id)),
  ];
  return keys.filter((k) => marks.value[k]?.hidden).length;
});

export const hasVisible = computed(() => ({
  news: (data.value?.news ?? []).some((n) => visible(newsKey(n.link))),
  feat: featureRows.value[view.sub].some(({ x }) => visible(featKey(x.id), x.cat)),
}));
