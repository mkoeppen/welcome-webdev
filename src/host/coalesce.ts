// Panel und Sidebar fragen gleichzeitig an: ein Ladevorgang für alle.
// Ein erzwungenes Laden wartet einen laufenden ab und startet danach neu (mehrere erzwungene teilen sich den Neustart).
export function coalesce<T>(run: (force: boolean) => Promise<T>) {
  let inflight: Promise<T> | undefined;
  let inflightForce = false;
  return (force = false): Promise<T> => {
    if (inflight && (inflightForce || !force)) return inflight;
    const p: Promise<T> = (inflight ? inflight.catch(() => {}).then(() => run(force)) : run(force)).finally(() => {
      if (inflight === p) inflight = undefined;
    });
    inflight = p;
    inflightForce = force;
    return p;
  };
}
