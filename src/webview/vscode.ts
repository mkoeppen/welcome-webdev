import type { ToHost } from '../shared/types';

interface Api {
  postMessage(m: ToHost): void;
  getState<T>(): T | undefined;
  setState(s: unknown): void;
}
declare function acquireVsCodeApi(): Api;

// Im Browser (`vp dev`) gibt es keinen Host: Zustand im localStorage, Daten aus dev-data.ts.
function devApi(): Api {
  return {
    getState: <T>() => JSON.parse(localStorage.getItem('state') || 'null') ?? (undefined as T | undefined),
    setState: (s) => localStorage.setItem('state', JSON.stringify(s)),
    postMessage: (m) => {
      if (m.type === 'ready' || m.type === 'refresh')
        import('./dev-data').then(({ devPayload }) => window.postMessage({ type: 'data', payload: devPayload() }, '*'));
    },
  };
}

export const vscode: Api = import.meta.env.DEV ? devApi() : acquireVsCodeApi();
