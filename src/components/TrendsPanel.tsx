import { useEffect, useState } from 'react';
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
  // Hover follows the mouse; a click pins a sample so it stays while new data arrives.
  const [hover, setHover] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const pinVisible = pin !== null && pin >= now - windowMs;
  const cursor = pinVisible ? pin : hover;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPin(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const common = {
    samples: history,
    windowMs,
    now,
    cursor,
    pinned: pinVisible,
    onHover: setHover,
    onPin: (t: number) => setPin((p) => (p === t ? null : t)),
  };

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
      <TrendChart {...common} title="Velocity RMS" unit="mm/s" series={velocity} fromZero zones={machine.limits} />
      <TrendChart {...common} title="Acceleration" unit="m/s²" series={acceleration} fromZero />
      <TrendChart {...common} title="Contact temperature" unit="°C" series={temperature} />
      <p className="muted small">
        {pinVisible ? (
          <>
            Showing the sample at {new Date(pin).toLocaleTimeString()} on all charts.{' '}
            <button type="button" className="link" onClick={() => setPin(null)}>
              Release
            </button>{' '}
            (or click the same point again, or press Esc).
          </>
        ) : (
          'Hover a chart to read the values; click (or tap) to pin a point on all charts.'
        )}
      </p>
      <p className="muted small">
        Velocity bands: severity zones A–D of the selected machine class. History lives in this browser tab only and
        starts when you connect.
      </p>
    </section>
  );
}
