import type { Sample } from '../model/messages';
import { AXES, ZONE_TEXT, zoneOf, type MachineClass } from '../model/sensor';

interface Props {
  sample: Sample | null;
  machine: MachineClass;
}

function fmt(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined ? '–' : v.toFixed(digits);
}

export function VibrationPanel({ sample, machine }: Props) {
  const usable = sample?.valid ? sample : null;
  const velocities = usable?.velocityRms ?? [null, null, null];
  const worst = velocities.reduce<number | null>((m, v) => (v === null ? m : m === null ? v : Math.max(m, v)), null);
  const worstZone = worst === null ? null : zoneOf(worst, machine.limits);

  return (
    <section className="panel">
      <h2>Vibration</h2>
      <div className="axis-grid">
        {AXES.map((axis, i) => {
          const v = velocities[i] ?? null;
          const zone = v === null ? null : zoneOf(v, machine.limits);
          return (
            <div key={axis} className={`axis-card ${zone ? `zone-${zone}` : ''}`}>
              <div className="axis-name">Axis {axis}</div>
              <div className="big">
                {fmt(v)} <span className="unit">mm/s</span>
              </div>
              <div className="muted small">velocity RMS{zone ? ` · zone ${zone}` : ''}</div>
              <div className="sub">
                {fmt(usable?.acceleration[i])} <span className="unit">m/s²</span>
              </div>
              <div className="muted small">acceleration</div>
            </div>
          );
        })}
      </div>
      <p className={`zone-line ${worstZone ? `zone-text-${worstZone}` : 'muted'}`}>
        {worstZone ? `Worst axis: ${ZONE_TEXT[worstZone]}` : 'No valid vibration data'}
      </p>
      <p className="muted small">
        Zones for {machine.label}: A/B {machine.limits[0]}, B/C {machine.limits[1]}, C/D {machine.limits[2]} mm/s.
        Reference only; for alarms, compare with a baseline taken on the healthy motor.
      </p>
    </section>
  );
}
