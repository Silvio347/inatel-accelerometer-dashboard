import type { MouseEvent, PointerEvent } from 'react';
import type { Sample } from '../model/messages';
import { zoneOf, type Zone } from '../model/sensor';

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
  /** Severity zone limits (A/B, B/C, C/D): shaded bands with the letters outside the plot. */
  zones?: [number, number, number];
  digits?: number;
  /** Time (receivedAt) of the sample under the cursor or pinned, shared by all charts. */
  cursor: number | null;
  pinned: boolean;
  onHover: (t: number | null) => void;
  onPin: (t: number) => void;
}

const W = 640;
const H = 200;
const PAD = { left: 44, top: 10, bottom: 22 };
/** A gap longer than this between samples breaks the line. */
const GAP_MS = 5000;
const ZONES: Zone[] = ['A', 'B', 'C', 'D'];

function niceStep(range: number): number {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Index of the sample closest in time to `t` (samples are sorted by receivedAt). */
function nearest(samples: Sample[], t: number): number {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((samples[mid]?.receivedAt ?? 0) < t) lo = mid + 1;
    else hi = mid;
  }
  const prev = samples[lo - 1];
  const here = samples[lo];
  if (prev && here && t - prev.receivedAt < here.receivedAt - t) return lo - 1;
  return lo;
}

export function TrendChart(props: Props) {
  const { title, unit, samples, series, windowMs, now, fromZero, zones, digits = 2 } = props;
  const { cursor, pinned, onHover, onPin } = props;
  // Same right margin on every chart (room for the zone letters) so the shared cursor lines up.
  const padRight = 26;
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
    // Keep the next zone limit in view so the current zone band is visible.
    const next = zones?.find((g) => g > hi);
    if (next !== undefined) hi = Math.max(hi, next * 1.05);
  }
  if (hi - lo < 1e-6) {
    hi += 0.5;
    lo -= fromZero ? 0 : 0.5;
  }
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const plotRight = W - padRight;
  const x = (t: number) => PAD.left + ((t - t0) / windowMs) * (plotRight - PAD.left);
  const y = (v: number) => H - PAD.bottom - ((v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const yClamped = (v: number) => y(Math.min(hi, Math.max(lo, v)));

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

  /** Sample time under the pointer, or null outside the plot / with no data. */
  function timeAt(e: MouseEvent<SVGSVGElement>): number | null {
    if (visible.length === 0) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    if (vx < PAD.left - 8 || vx > plotRight + 8) return null;
    const t = t0 + ((vx - PAD.left) / (plotRight - PAD.left)) * windowMs;
    return visible[nearest(visible, t)]?.receivedAt ?? null;
  }

  // The cursor is shared by all charts; show it here only if this chart has that sample.
  const idx = cursor === null || visible.length === 0 ? -1 : nearest(visible, cursor);
  const point = idx >= 0 && Math.abs((visible[idx]?.receivedAt ?? Infinity) - (cursor ?? 0)) <= GAP_MS ? visible[idx] : undefined;
  const px = point ? x(point.receivedAt) : 0;
  const tipRight = px > W * 0.6;

  const bands = zones
    ? ZONES.map((zone, i) => {
        const from = i === 0 ? lo : zones[i - 1]!;
        const to = i === 3 ? hi : zones[i]!;
        return { zone, from: Math.max(lo, from), to: Math.min(hi, to) };
      }).filter((b) => b.to > b.from)
    : [];

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
      <div className="chart-box">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          role="img"
          aria-label={`${title} trend`}
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
            if (e.pointerType === 'mouse') onHover(timeAt(e));
          }}
          onPointerLeave={() => onHover(null)}
          onClick={(e) => {
            const t = timeAt(e);
            if (t !== null) onPin(t);
          }}
        >
          {bands.map((b) => (
            <g key={b.zone}>
              <rect
                className={`chart-band band-${b.zone}`}
                x={PAD.left}
                width={plotRight - PAD.left}
                y={y(b.to)}
                height={y(b.from) - y(b.to)}
              />
              {y(b.from) - y(b.to) > 12 && (
                <text className={`chart-zone zone-text-${b.zone}`} x={plotRight + 8} y={(y(b.from) + y(b.to)) / 2 + 4}>
                  {b.zone}
                </text>
              )}
            </g>
          ))}
          {ticks.map((v) => (
            <g key={v}>
              <line className="chart-grid" x1={PAD.left} x2={plotRight} y1={y(v)} y2={y(v)} />
              <text className="chart-tick" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
                {Number(v.toFixed(3))}
              </text>
            </g>
          ))}
          {zones
            ?.filter((g) => g > lo && g < hi)
            .map((g) => <line key={g} className="chart-limit" x1={PAD.left} x2={plotRight} y1={y(g)} y2={y(g)} />)}
          {series.map((se) => (
            <path key={se.label} d={path(se)} fill="none" stroke={se.color} strokeWidth={1.6} />
          ))}
          {point && (
            <g>
              <line className={pinned ? 'chart-cursor is-pinned' : 'chart-cursor'} x1={px} x2={px} y1={PAD.top} y2={H - PAD.bottom} />
              {series.map((se) => {
                const v = se.value(point);
                return v === null ? null : (
                  <circle key={se.label} cx={px} cy={yClamped(v)} r={3.5} fill={se.color} stroke="#0b0f14" strokeWidth={1.5} />
                );
              })}
            </g>
          )}
          <text className="chart-tick" x={PAD.left} y={H - 6}>
            {clockLabel(t0)}
          </text>
          <text className="chart-tick" x={plotRight} y={H - 6} textAnchor="end">
            {clockLabel(now)}
          </text>
          {visible.length === 0 && (
            <text className="chart-empty" x={W / 2} y={H / 2} textAnchor="middle">
              No valid data in this window
            </text>
          )}
        </svg>
        {point && (
          <div
            className="chart-tip"
            style={{
              left: `${(px / W) * 100}%`,
              transform: tipRight ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
            }}
          >
            <div className="chart-tip-time">
              {clockLabel(point.receivedAt)}
              {pinned && <span className="muted"> · pinned</span>}
            </div>
            {series.map((se) => {
              const v = se.value(point);
              return (
                <div key={se.label} className="chart-tip-row">
                  <i style={{ background: se.color }} />
                  <span>{se.label}</span>
                  <b>{v === null ? '–' : v.toFixed(digits)}</b>
                  {zones && v !== null && (
                    <span className={`zone-text-${zoneOf(v, zones)}`}>zone {zoneOf(v, zones)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
