import { expect, test } from 'vite-plus/test';
import { coalesce } from './coalesce';

// Jeder Aufruf von run() liefert ein Promise, das der Test von Hand erfüllt oder ablehnt
function setup() {
  const runs: { force: boolean; ok: (v: string) => void; fail: (e: Error) => void }[] = [];
  const load = coalesce(
    (force) =>
      new Promise<string>((ok, fail) => {
        runs.push({ force, ok, fail });
      }),
  );
  return { runs, load };
}
const tick = () => new Promise((r) => setTimeout(r));

test('mehrere normale Anfragen teilen sich einen Lauf', async () => {
  const { runs, load } = setup();
  const a = load();
  const b = load();
  expect(runs).toHaveLength(1);
  runs[0]!.ok('x');
  expect(await a).toBe('x');
  expect(await b).toBe('x');
});

test('erzwungenes Laden startet erst nach dem laufenden und liefert dessen Ergebnis', async () => {
  const { runs, load } = setup();
  const normal = load();
  const forced = load(true);
  const forced2 = load(true);
  expect(runs).toHaveLength(1);
  runs[0]!.ok('alt');
  await tick();
  expect(runs).toHaveLength(2);
  expect(runs[1]!.force).toBe(true);
  runs[1]!.ok('neu');
  expect([await normal, await forced, await forced2]).toEqual(['alt', 'neu', 'neu']);
});

test('normale Anfrage während erzwungenem Laden teilt dessen Lauf', async () => {
  const { runs, load } = setup();
  const forced = load(true);
  const normal = load();
  expect(runs).toHaveLength(1);
  runs[0]!.ok('neu');
  expect([await forced, await normal]).toEqual(['neu', 'neu']);
});

test('Fehler im ersten Lauf blockiert das erzwungene Laden nicht und räumt auf', async () => {
  const { runs, load } = setup();
  const first = load();
  const forced = load(true);
  runs[0]!.fail(new Error('offline'));
  await expect(first).rejects.toThrow('offline');
  await tick();
  runs[1]!.ok('neu');
  expect(await forced).toBe('neu');
  await tick();
  load();
  expect(runs).toHaveLength(3);
});
