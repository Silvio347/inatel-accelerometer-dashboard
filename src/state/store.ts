import { create } from 'zustand';
import { config } from '../config';
import type { Sample, SourceStatus } from '../model/messages';

/** 'demo' = data generated in the browser by src/sim/demo.ts, no broker. */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'demo';

export interface Stats {
  received: number;
  /** Packets missing according to the PLC counter (seq gaps). */
  lost: number;
}

interface DashboardState {
  connection: ConnectionState;
  error: string | null;
  source: SourceStatus;
  latest: Sample | null;
  /** Oldest first, at most config.historyMax samples. */
  history: Sample[];
  stats: Stats;
  addSample: (sample: Sample) => void;
  addSamples: (samples: Sample[]) => void;
  setConnection: (connection: ConnectionState) => void;
  setError: (error: string | null) => void;
  setSource: (source: SourceStatus) => void;
  reset: () => void;
}

const initialData = () => ({
  source: 'unknown' as SourceStatus,
  latest: null,
  history: [] as Sample[],
  stats: { received: 0, lost: 0 },
});

function gap(prev: Sample | null, next: Sample): number {
  if (prev?.seq == null || next.seq == null) return 0;
  const d = next.seq - prev.seq;
  // d <= 0: PLC restarted or duplicate. Big jumps are treated as a restart too.
  return d > 1 && d < 3600 ? d - 1 : 0;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  connection: 'disconnected',
  error: null,
  ...initialData(),
  addSample: (sample) =>
    set((s) => {
      const history = s.history.length >= config.historyMax ? s.history.slice(1) : s.history.slice();
      history.push(sample);
      return {
        latest: sample,
        history,
        stats: { received: s.stats.received + 1, lost: s.stats.lost + gap(s.latest, sample) },
      };
    }),
  addSamples: (samples) =>
    set((s) => {
      if (samples.length === 0) return {};
      const history = s.history.concat(samples).slice(-config.historyMax);
      return {
        latest: samples[samples.length - 1] ?? s.latest,
        history,
        stats: { received: s.stats.received + samples.length, lost: s.stats.lost },
      };
    }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
  setSource: (source) => set({ source }),
  reset: () => set(initialData()),
}));
