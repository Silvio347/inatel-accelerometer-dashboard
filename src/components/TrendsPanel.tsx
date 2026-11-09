import type { Sample } from '../model/messages';
import type { MachineClass } from '../model/sensor';
import { TrendChart, type Series } from './TrendChart';

const COLORS = ['#58a6ff', '#3fb950', '#d2a8ff'] as const;

const WINDOWS: { label: string; ms: number }[] = [
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: '1 h', ms: 3_600_000 },
];

const axisSeries = (pick: (s: Sample) => (number | null)[]): Series[] =>
  ['X', 'Y', 'Z'].map((axis, i) => ({
    label: axis,
    color: COLORS[i] ?? '#fff',
    value: (s) => pick(s)[i] ?? null,
  }));

const velocity = axisSeries((s) => s.velocityRms);
const acceleration = axisSeries((s) => s.acceleration);
const temperature: Series[] = [{ label: 'Contact', color: '#d29922', value: (s) => s.temperature }];

interface Props {
  history: Sample[];
  now: number;
  machine: MachineClass;
  windowMs: number;
  onWindowChange: (ms: number) => void;
}

export function TrendsPanel({ history, now, machine, windowMs, onWindowChange }: Props) {
  const guides = machine.limits.map((value, i) => ({ value, label: ['A/B', 'B/C', 'C/D'][i] ?? '' }));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Trends</h2>
        <div className="segmented" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w.ms}
              type="button"
              className={w.ms === windowMs ? '' : 'secondary'}
              onClick={() => onWindowChange(w.ms)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <TrendChart
        title="Velocity RMS"
        unit="mm/s"
        samples={history}
        series={velocity}
        windowMs={windowMs}
        now={now}
        fromZero
        guides={guides}
      />
      <TrendChart
        title="Acceleration"
        unit="m/s²"
        samples={history}
        series={acceleration}
        windowMs={windowMs}
        now={now}
        fromZero
      />
      <TrendChart
        title="Contact temperature"
        unit="°C"
        samples={history}
        series={temperature}
        windowMs={windowMs}
        now={now}
      />
      <p className="muted small">History lives in this browser tab only and starts when you connect.</p>
    </section>
  );
}
