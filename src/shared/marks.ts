import type { Mark, Marks } from './types';

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
