# Web Dev Welcome

VS-Code-Extension: öffnet beim ersten Start des Tages einen Tab mit Web-News (RSS) und Baseline-Features (newly / widely available, CSS/HTML/JS). Erneut öffnen: Globus-Icon in der Activity Bar (Sidebar, mit Zähler für Ungelesenes) oder in der Editor-Toolbar.

Daten: [web-features](https://github.com/web-platform-dx/web-features) (Baseline), MDN-Links aus den [Browser-Compat-Daten](https://github.com/mdn/browser-compat-data) (20 MB, 7 Tage gecacht) und RSS-Feeds (Liste oben in `src/host/load.ts`, mit Bild und Beschreibung, News 6 h gecacht).

## Aufbau (Vite+, Vue, TypeScript, Sass)

| Pfad           | Inhalt                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `src/host/`    | Extension-Host (Laden, Cache, Webview-Anbindung) → `dist/extension.cjs` |
| `src/webview/` | Vue-App und SCSS → statisches Build in `dist/webview/`                  |
| `src/shared/`  | Typen und `applyMarks`, von Host und Webview genutzt                    |

Der Host lädt `dist/webview/index.html`, schreibt die Asset-URLs auf Webview-URIs um und liefert die Daten nach einer `ready`-Nachricht per `postMessage`.

## Entwicklung

```
vp install
vp dev            # Webview im Browser mit Fixture-Daten (src/webview/dev-data.ts)
vp test run       # Unit-Tests; LIVE=1 vp test run zusätzlich mit echten Feeds
vp check          # Format + Lint
pnpm typecheck    # vue-tsc
```

## Installation

```
pnpm package      # baut und erzeugt webdev-welcome-<version>.vsix
code --install-extension webdev-welcome-0.1.0.vsix
```
