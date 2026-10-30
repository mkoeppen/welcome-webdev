import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { applyMarks, pruneMarks, pruneSaved, saveFavs } from '../shared/marks';
import type { Saved } from '../shared/marks';
import type { Mark, Marks, Mdn, NewsItem, Payload, ToHost, ToWebview } from '../shared/types';
import { countUnread } from '../shared/unread';
import { coalesce } from './coalesce';
import { load } from './load';
import { due, merge, oldest } from './merge';
import type { Cache } from './merge';
import { split } from './split';

export function activate(ctx: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;
  let marks: Marks = ctx.globalState.get('marks') || {};
  let saved: Saved = ctx.globalState.get('saved') || {};
  const views = new Set<vscode.Webview>();
  const root = vscode.Uri.joinPath(ctx.extensionUri, 'dist', 'webview');

  // Große Caches liegen als Dateien im globalStorage, damit sie nicht mit dem globalState bei jedem VS-Code-Start geladen werden
  const dir = ctx.globalStorageUri.fsPath;
  const readJson = <T>(name: string) =>
    readFile(join(dir, name), 'utf8').then(
      (t) => JSON.parse(t) as T,
      () => undefined,
    );
  const writeJson = (name: string, v: unknown) =>
    mkdir(dir, { recursive: true })
      .then(() => writeFile(join(dir, name), JSON.stringify(v)))
      .catch(() => {});
  // Altlasten aus Version 0.1.0
  ctx.globalState.update('cache2', undefined);
  ctx.globalState.update('mdn', undefined);

  // Cache einmal von der Platte lesen (asynchron, beim ersten build abgewartet), danach nur im Speicher halten
  let cache: Cache | undefined;
  let mdn: Mdn | undefined;
  const disk = Promise.all([readJson<Cache>('cache.json'), readJson<Mdn>('mdn.json')]).then(([c, m]) => {
    cache = c;
    mdn = m;
  });

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

  // Favorisierte News, die nicht mehr im Feed stehen, neueste zuerst
  const savedItems = (news: NewsItem[]) =>
    Object.values(saved)
      .filter((s) => !news.some((n) => n.link === s.link))
      .sort((a, b) => b.date - a.date);

  async function build(force = false): Promise<Payload> {
    await disk;
    if (force || !cache || due(cache)) {
      const data = await load(mdn);
      const m = merge(cache, data);
      cache = m.cache;
      if (data.mdn && data.mdn !== mdn) writeJson('mdn.json', (mdn = data.mdn));
      if (m.persist) writeJson('cache.json', cache);
      // Markierungen aufräumen nur bei vollständigem Laden: ein ausgefallener Feed soll keine Gelesen-Stände verlieren
      if (data.news.length && !data.failed.length) {
        marks = pruneMarks(marks, new Set(data.news.map((n) => 'n:' + n.link)));
        ctx.globalState.update('marks', marks);
      }
    }
    const { features, news, failed } = cache.data;
    // Favoriten aus dem aktuellen Feed festhalten, Schnappschüsse ohne Stern verwerfen
    saved = pruneSaved(saveFavs(saved, news, Object.keys(marks)), marks);
    ctx.globalState.update('saved', saved);
    last = {
      news,
      features: features && split(features),
      mdn: mdn?.map ?? {},
      at: new Date(oldest(cache)).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      failed,
      marks,
      saved: savedItems(news),
    };
    refresh();
    return last;
  }

  const payload = coalesce(build);

  const send = (webview: vscode.Webview, m: ToWebview) => webview.postMessage(m);

  // Webview -> Extension: Markierung speichern und an die anderen offenen Webviews (Tab/Sidebar) weiterreichen
  function wire(webview: vscode.Webview) {
    views.add(webview);
    webview.onDidReceiveMessage(async (m: ToHost) => {
      if (m.type === 'ready') return send(webview, { type: 'data', payload: await payload() });
      if (m.type === 'refresh') {
        // bei Fehler den letzten Stand senden, damit die Webview nicht im Lade-Zustand hängen bleibt
        const p = await payload(true).catch(() => last);
        if (p) for (const v of views) send(v, { type: 'data', payload: p });
        return;
      }
      if (m.type !== 'mark' || !Array.isArray(m.keys) || !m.patch) return;
      const keys = m.keys.filter((k) => typeof k === 'string' && /^[nf]:/.test(k));
      const patch: Mark = {};
      for (const p of ['read', 'fav', 'hidden'] as const) if (p in m.patch) patch[p] = m.patch[p] ? 1 : 0;
      marks = applyMarks(marks, keys, patch);
      ctx.globalState.update('marks', marks);
      if (patch.fav) {
        saved = saveFavs(saved, last?.news ?? [], keys);
        ctx.globalState.update('saved', saved);
      }
      refresh();
      for (const v of views) if (v !== webview) send(v, { type: 'marks', marks, saved: savedItems(last?.news ?? []) });
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
  if (vscode.workspace.getConfiguration('webdevWelcome').get('openOnStartup', true) && ctx.globalState.get('lastShown') !== today) {
    ctx.globalState.update('lastShown', today);
    open();
  }
}
