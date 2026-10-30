import { WIDELY_RECENT_DAYS } from '../shared/constants';
import type { Features, SplitFeatures } from '../shared/types';

// Zeitfenster: "newly" = baseline low; "widely" = zuletzt in den letzten 365 Tagen widely geworden
// (entspricht: überall verfügbar seit 2,5 bis 3,5 Jahren). Älteres steht jeweils unter "Ältere".
export function split(features: Features, now = Date.now()): SplitFeatures {
  const cutoff = new Date(now - WIDELY_RECENT_DAYS * 864e5).toISOString().slice(0, 10);
  return {
    newlyRecent: features.newly.filter((f) => f.low >= cutoff),
    newlyOlder: features.newly.filter((f) => f.low < cutoff),
    widelyRecent: features.widely.filter((f) => f.high >= cutoff),
    widelyOlder: features.widely.filter((f) => f.high < cutoff),
  };
}
