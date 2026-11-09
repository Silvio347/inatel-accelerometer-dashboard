import type { Sample } from '../model/messages';

export interface Series {
  label: string;
  color: string;
  value: (s: Sample) => number | null;
}

interface Props {
  title: string;
  unit: string;
  samples: Sample[];
  series: Series[];
  windowMs: number;
  now: number;
  /** Start the y axis at zero (vibration) instead of fitting the data (temperature). */
  fromZero?: boolean;
  /** Horizontal reference lines, e.g. severity zone limits. */
  guides?: { value: number; label: string }[];
}

const W = 640;
const H = 200;
const PAD = { left: 44, right: 12, top: 10, bottom: 22 };
/** A gap longer than this between samples breaks the line. */
const GAP_MS = 5000;

function niceStep(range: number): number {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TrendChart({ title, unit, samples, series, windowMs, now, fromZero, guides = [] }: Props) {
  const t0 = now - windowMs;
  const visible = samples.filter((s) => s.receivedAt >= t0 && s.valid);

  const values: number[] = [];
  for (const s of visible) {
    for (const se of series) {
      const v = se.value(s);
      if (v !== null) values.push(v);
    }
  }
  let lo = values.length ? Math.min(...values) : 0;
  let hi = values.length ? Math.max(...values) : 1;
  if (fromZero) {
    lo = 0;
    // Keep the next guide line in view so the zone is visible.
    const next = guides.map((g) => g.value).find((g) => g > hi);
    if (next !== undefined) hi = Math.max(hi, next * 1.05);
  }
  if (hi - lo < 1e-6) {
    hi += 0.5;
    lo -= fromZero ? 0 : 0.5;
  }
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const x = (t: number) => PAD.left + ((t - t0) / windowMs) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);

  function path(se: Series): string {
    let d = '';
    let prevT: number | null = null;
    for (const s of visible) {
      const v = se.value(s);
      if (v === null) {
        prevT = null;
        continue;
      }
      const cmd = prevT === null || s.receivedAt - prevT > GAP_MS ? 'M' : 'L';
      d += `${cmd}${x(s.receivedAt).toFixed(1)},${y(v).toFixed(1)}`;
      prevT = s.receivedAt;
    }
    return d;
  }

  return (
    <figure className="chart">
      <figcaption>
        <span>
          {title} <span className="muted">({unit})</span>
        </span>
        <span className="legend">
          {series.map((se) => (
            <span key={se.label}>
              <i style={{ background: se.color }} /> {se.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={`${title} trend`}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="chart-tick" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
              {Number(v.toFixed(3))}
            </text>
          </g>
        ))}
        {guides
          .filter((g) => g.value >= lo && g.value <= hi)
          .map((g) => (
            <g key={g.label}>
              <line className="chart-guide" x1={PAD.left} x2={W - PAD.right} y1={y(g.value)} y2={y(g.value)} />
              <text className="chart-guide-label" x={W - PAD.right - 4} y={y(g.value) - 3} textAnchor="end">
                {g.label}
              </text>
            </g>
          ))}
        {series.map((se) => (
          <path key={se.label} d={path(se)} fill="none" stroke={se.color} strokeWidth={1.6} />
        ))}
        <text className="chart-tick" x={PAD.left} y={H - 6}>
          {clockLabel(t0)}
        </text>
        <text className="chart-tick" x={W - PAD.right} y={H - 6} textAnchor="end">
          {clockLabel(now)}
        </text>
        {visible.length === 0 && (
          <text className="chart-empty" x={W / 2} y={H / 2} textAnchor="middle">
            No valid data in this window
          </text>
        )}
      </svg>
    </figure>
  );
}
