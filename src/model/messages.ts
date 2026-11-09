// Parsers for the MQTT payloads. The contract is in docs/mqtt-contract.md.
// Anything that does not match is rejected, so a bad publisher cannot put
// the dashboard in an undefined state.
import { bitSet, PQI_VALID_BIT } from './sensor';

export type Triple = [number | null, number | null, number | null];

export interface Sample {
  /** Publisher timestamp (ms since epoch), if it sent one. */
  ts: number | null;
  /** Local time the message arrived; used for staleness and the charts. */
  receivedAt: number;
  /** PLC packet counter, if sent. */
  seq: number | null;
  /** Bit 7 of the PQI: the sensor process data is valid. */
  valid: boolean;
  pqi: number;
  flags: number;
  /** mm/s */
  velocityRms: Triple;
  /** m/s² (RMS or peak-to-peak, see docs/sensor-cmsw-iol.md) */
  acceleration: Triple;
  /** °C */
  temperature: number | null;
  /** mbar (= hPa) */
  pressure: number | null;
  /** % */
  humidity: number | null;
}

export type SourceStatus = 'online' | 'offline' | 'simulated' | 'unknown';

function parseJson(payload: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(payload);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** A finite number, or null for null. `undefined` means "invalid". */
function num(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function int(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

function triple(value: unknown): Triple | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const out = value.map(num);
  if (out.some((v) => v === undefined)) return null;
  return out as Triple;
}

export function parseSample(payload: string, receivedAt: number): Sample | null {
  const obj = parseJson(payload);
  if (!obj) return null;
  const velocityRms = triple(obj.velocityRms);
  const acceleration = triple(obj.acceleration);
  const temperature = num(obj.temperature);
  const pressure = num(obj.pressure);
  const humidity = num(obj.humidity);
  const pqi = int(obj.pqi, 255);
  const flags = int(obj.flags, 0xffff);
  if (!velocityRms || !acceleration || pqi === null || flags === null) return null;
  if (temperature === undefined || pressure === undefined || humidity === undefined) return null;
  const ts = num(obj.ts);
  return {
    ts: ts ?? null,
    receivedAt,
    seq: int(obj.seq, 0xffffffff),
    valid: bitSet(pqi, PQI_VALID_BIT),
    pqi,
    flags,
    velocityRms,
    acceleration,
    temperature,
    pressure,
    humidity,
  };
}

export function parseSourceStatus(payload: string): SourceStatus {
  const s = payload.trim();
  return s === 'online' || s === 'offline' || s === 'simulated' ? s : 'unknown';
}
