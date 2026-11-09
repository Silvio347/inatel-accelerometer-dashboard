import type { Sample } from '../model/messages';
import { bitSet, PQI_BITS, SENSOR_FLAGS } from '../model/sensor';

function Led({ on, kind }: { on: boolean | null; kind: 'good' | 'bad' }) {
  const cls = on === null ? 'led-unknown' : on ? (kind === 'good' ? 'led-on' : 'led-alarm') : 'led-off';
  return <span className={`led ${cls}`} />;
}

export function StatusPanel({ sample }: { sample: Sample | null }) {
  const pqi = sample?.pqi ?? null;
  const flags = sample?.valid ? sample.flags : null;
  const active = flags === null ? [] : SENSOR_FLAGS.filter((f) => bitSet(flags, f.bit));

  return (
    <section className="panel">
      <h2>IO-Link port and sensor alarms</h2>
      <h3>
        Port qualifier (PQI){' '}
        <span className="muted">{pqi === null ? '' : `16#${pqi.toString(16).toUpperCase().padStart(2, '0')}`}</span>
      </h3>
      <ul className="bits">
        {PQI_BITS.map((b) => (
          <li key={b.bit}>
            <Led on={pqi === null ? null : bitSet(pqi, b.bit)} kind={b.good ? 'good' : 'bad'} /> {b.label}
          </li>
        ))}
      </ul>
      <h3>Sensor alarm bits</h3>
      {flags === null ? (
        <p className="muted small">No valid data.</p>
      ) : active.length === 0 ? (
        <p className="muted small">None active. They only fire if limits were set in the sensor parameters.</p>
      ) : (
        <ul className="bits">
          {active.map((f) => (
            <li key={f.bit}>
              <Led on kind="bad" /> {f.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
