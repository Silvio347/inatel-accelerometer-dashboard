import type { Sample } from '../model/messages';

function fmt(v: number | null | undefined, digits: number): string {
  return v === null || v === undefined ? '–' : v.toFixed(digits);
}

export function EnvironmentPanel({ sample, history }: { sample: Sample | null; history: Sample[] }) {
  const usable = sample?.valid ? sample : null;
  const temps = history.filter((s) => s.valid && s.temperature !== null).map((s) => s.temperature as number);
  const maxTemp = temps.length ? Math.max(...temps) : null;

  return (
    <section className="panel">
      <h2>Temperature and environment</h2>
      <dl className="readings">
        <dt>Contact temperature</dt>
        <dd>
          {fmt(usable?.temperature, 2)} <span className="unit">°C</span>
        </dd>
        <dt>Highest in history</dt>
        <dd>
          {fmt(maxTemp, 2)} <span className="unit">°C</span>
        </dd>
        <dt>Ambient pressure</dt>
        <dd>
          {fmt(usable?.pressure, 1)} <span className="unit">mbar</span>
        </dd>
        <dt>Ambient humidity</dt>
        <dd>
          {fmt(usable?.humidity, 1)} <span className="unit">%</span>
        </dd>
      </dl>
      <p className="muted small">The sensor is rated for a contact temperature up to 80 °C.</p>
    </section>
  );
}
