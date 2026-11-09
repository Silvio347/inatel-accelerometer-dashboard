import { config } from '../config';
import { disconnectBroker } from '../mqtt/connection';
import { stopDemo } from '../sim/demo';
import { useDashboardStore } from '../state/store';

function formatAge(ms: number): string {
  if (ms < 1500) return 'now';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}min ago`;
}

export function StatusBar({ now }: { now: number }) {
  const connection = useDashboardStore((s) => s.connection);
  const source = useDashboardStore((s) => s.source);
  const error = useDashboardStore((s) => s.error);
  const latest = useDashboardStore((s) => s.latest);
  const stats = useDashboardStore((s) => s.stats);
  const age = latest ? now - latest.receivedAt : null;
  const fresh = age !== null && age <= config.staleAfterMs;

  return (
    <div className="status-bar">
      <span className={`pill pill-${connection}`}>
        {connection === 'demo' ? 'Demo mode (no broker)' : `Broker: ${connection}`}
      </span>
      <span className={`pill pill-source-${source}`}>Bridge: {source === 'simulated' ? 'SIMULATED' : source}</span>
      <span className={`pill ${fresh ? 'pill-connected' : 'pill-stale'}`}>
        PLC data: {age === null ? 'none' : formatAge(age)}
      </span>
      {latest && (
        <span className={`pill ${latest.valid ? 'pill-connected' : 'pill-error'}`}>
          Sensor: {latest.valid ? 'valid' : 'NOT VALID'}
        </span>
      )}
      {stats.received > 0 && (
        <span className="pill" title="Packets received / missing according to the PLC counter">
          {stats.received} rx{stats.lost > 0 ? `, ${stats.lost} lost` : ''}
        </span>
      )}
      {error && connection !== 'disconnected' && <span className="error">{error}</span>}
      {connection !== 'disconnected' && (
        <button type="button" className="secondary" onClick={connection === 'demo' ? stopDemo : disconnectBroker}>
          {connection === 'demo' ? 'Stop demo' : 'Disconnect'}
        </button>
      )}
    </div>
  );
}
