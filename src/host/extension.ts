import { readFileSync } from 'node:fs';
import * as vscode from 'vscode';
import { applyMarks } from '../shared/marks';
import type { Mark, Marks, Mdn, NewsItem, Features, Payload, ToHost, ToWebview } from '../shared/types';
import { countUnread } from '../shared/unread';
import { load } from './load';
import { split } from './split';

const CACHE_MS = 6 * 3600e3;

interface Cache {
  at: number;
  data: { features: Features | null; news: NewsItem[]; failed: string[] };
}

export function activate(ctx: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  let marks: Marks = ctx.globalState.get('marks') || {};
  const views = new Set<vscode.Webview>();
  const root = vscode.Uri.joinPath(ctx.extensionUri, 'dist', 'webview');

  let sidebar: vscode.WebviewView | undefined;
  let last: Payload | undefined;

  // Ungelesen-Zähler als Badge am Activity-Bar-Icon (VS Code legt die Sidebar erst beim ersten Öffnen an)
  function refresh() {
    if (!sidebar || !last) return;
    const c = countUnread(last.news, last.features, marks);
    const n = c.news + c.newly + c.widely;
    sidebar.badge = n ? { value: n, tooltip: `${n} ungelesen (${c.news} News, ${c.newly + c.widely} Features)` } : undefined;
  }

  // Statisches Vite-Build der Webview; Asset-URLs auf Webview-URIs umschreiben, CSP ergänzen
  function page(webview: vscode.Webview) {
    const base = webview.asWebviewUri(root).toString();
    const csp = `default-src 'none'; img-src https: ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource}`;
    return readFileSync(vscode.Uri.joinPath(root, 'index.html').fsPath, 'utf8')
      .replaceAll('./assets/', `${base}/assets/`)
      .replaceAll(' crossorigin', '')
      .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
  }

  async function build(force = false): Promise<Payload> {
    let cached = ctx.globalState.get<Cache>('cache2');
    let mdn = ctx.globalState.get<Mdn>('mdn');
    if (force || !cached || Date.now() - cached.at > CACHE_MS) {
      const data = await load(mdn);
      // Komplett offline: den alten Stand behalten statt ihn durch eine leere Liste zu ersetzen
      if (!cached || data.features || data.news.length) {
        cached = { at: Date.now(), data: { features: data.features, news: data.news, failed: data.failed } };
        if (data.mdn) ctx.globalState.update('mdn', (mdn = data.mdn));
        if (data.features) ctx.globalState.update('cache2', cached);
        if (data.news.length) {
          // Markierungen für aus dem Feed gefallene News verwerfen
          const keep = new Set(data.news.map((n) => 'n:' + n.link));
          marks = Object.fromEntries(Object.entries(marks).filter(([k]) => !k.startsWith('n:') || keep.has(k)));
          ctx.globalState.update('marks', marks);
        }
      }
    }
    const { features, news, failed } = cached.data;
    last = {
      news,
      features: features && split(features),
      mdn: mdn?.map ?? {},
      at: new Date(cached.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      failed,
      marks,
    };
    refresh();
    return last;
  }

  // Panel und Sidebar fragen gleichzeitig an: ein Ladevorgang für beide
  let inflight: Promise<Payload> | undefined;
  const payload = (force = false) => (inflight ??= build(force).finally(() => (inflight = undefined)));

  const send = (webview: vscode.Webview, m: ToWebview) => webview.postMessage(m);

  // Webview -> Extension: Markierung speichern und an die anderen offenen Webviews (Tab/Sidebar) weiterreichen
  function wire(webview: vscode.Webview) {
    views.add(webview);
    webview.onDidReceiveMessage(async (m: ToHost) => {
      if (m.type === 'ready') return send(webview, { type: 'data', payload: await payload() });
      if (m.type === 'refresh') {
        const p = await payload(true);
        for (const v of views) send(v, { type: 'data', payload: p });
        return;
      }
      if (m.type !== 'mark' || !Array.isArray(m.keys) || !m.patch) return;
      const keys = m.keys.filter((k) => typeof k === 'string' && /^[nf]:/.test(k));
      const patch: Mark = {};
      for (const p of ['read', 'fav', 'hidden'] as const) if (p in m.patch) patch[p] = m.patch[p] ? 1 : 0;
      marks = applyMarks(marks, keys, patch);
      ctx.globalState.update('marks', marks);
      refresh();
      for (const v of views) if (v !== webview) send(v, { type: 'marks', marks });
    });
  }

  function open() {
    if (panel) return panel.reveal();
    panel = vscode.window.createWebviewPanel('webdevWelcome', 'Web Dev Welcome', vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [root],
    });
    const webview = panel.webview;
    wire(webview);
    panel.onDidDispose(() => {
      panel = undefined;
      views.delete(webview);
    });
    webview.html = page(webview);
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand('webdevWelcome.open', open),
    vscode.window.registerWebviewViewProvider(
      'webdevWelcome.view',
      {
        resolveWebviewView(view) {
          view.webview.options = { enableScripts: true, localResourceRoots: [root] };
          wire(view.webview);
          sidebar = view;
          view.onDidDispose(() => {
            views.delete(view.webview);
            if (sidebar === view) sidebar = undefined;
          });
          view.webview.html = page(view.webview);
          refresh();
        },
      },
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  const today = new Date().toISOString().slice(0, 10);
  if (ctx.globalState.get('lastShown') !== today) {
    ctx.globalState.update('lastShown', today);
    open();
  }
}
