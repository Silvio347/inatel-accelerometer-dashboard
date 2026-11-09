// In-browser demo: invents plausible sensor data so the dashboard can be
// used without the PLC or the broker. The numbers are made up; they only
// imitate the shape of a motor that starts, runs, develops a vibration
// episode and stops. bridge/fake_plc.py follows the same rules.
import type { Sample, Triple } from '../model/messages';
import { useDashboardStore } from '../state/store';

const PERIOD_MS = 1000;
const RUN_S = 120;
const STOP_S = 40;
const CYCLE_S = RUN_S + STOP_S;
/** Runs 1, 4, 7, ... have a vibration episode on X between these seconds of the run. */
const EPISODE: [number, number] = [50, 85];
/** History made up on start; ends inside the episode of run 1, so it shows right away. */
const BACKFILL_S = 230;

interface SimState {
  temperature: number;
}

let timer: number | null = null;

function noise(amplitude: number): number {
  return (Math.random() * 2 - 1) * amplitude;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Sample at `t` seconds since the demo epoch. Mutates `state` (temperature lag). */
function sampleAt(t: number, state: SimState, receivedAt: number, seq: number): Sample {
  const cycle = Math.floor(t / CYCLE_S);
  const inCycle = t % CYCLE_S;
  const running = inCycle < RUN_S;
  // Speed ramps up over 5 s after start.
  const speed = running ? Math.min(1, inCycle / 5) : 0;
  const episode = running && cycle % 3 === 1 && inCycle >= EPISODE[0] && inCycle < EPISODE[1];
  const episodeGain = episode ? 1 + 3 * Math.sin((Math.PI * (inCycle - EPISODE[0])) / (EPISODE[1] - EPISODE[0])) : 1;

  const base: [number, number, number] = [1.1 * episodeGain, 0.85, 0.5];
  const vel = base.map((b) => Math.max(0, speed * (b + noise(0.08)) + noise(0.02))) as [number, number, number];
  const acc = vel.map((v, i) => Math.max(0, v * (i === 0 && episode ? 2.6 : 1.7) + noise(0.05))) as [number, number, number];

  const target = running ? 41 : 24;
  state.temperature += (target - state.temperature) * (1 - Math.exp(-1 / 180));

  let flags = 0;
  if (vel[0] > 4.5) flags |= 1 << 8;
  if (vel[1] > 4.5) flags |= 1 << 7;
  if (vel[2] > 4.5) flags |= 1 << 6;

  return {
    ts: receivedAt,
    receivedAt,
    seq,
    valid: true,
    pqi: 0xb0,
    flags,
    velocityRms: vel.map((v) => round(v, 2)) as Triple,
    acceleration: acc.map((v) => round(v, 2)) as Triple,
    temperature: round(state.temperature + noise(0.05), 2),
    pressure: round(915.4 + noise(0.3), 1),
    humidity: round(58 + 3 * Math.sin(t / 900) + noise(0.1), 2),
  };
}

export function startDemo(): void {
  stopDemo();
  const store = useDashboardStore.getState();
  store.reset();
  store.setError(null);
  store.setConnection('demo');
  store.setSource('simulated');

  const state: SimState = { temperature: 24 };
  const now = Date.now();
  const epoch = now - BACKFILL_S * 1000;
  let seq = 0;
  // Fill the charts with the last few minutes so the trends are not empty.
  const past: Sample[] = [];
  for (let s = 0; s < BACKFILL_S; s++) {
    past.push(sampleAt(s, state, epoch + s * 1000, ++seq));
  }
  store.addSamples(past);

  timer = window.setInterval(() => {
    const t = Date.now();
    useDashboardStore.getState().addSample(sampleAt((t - epoch) / 1000, state, t, ++seq));
  }, PERIOD_MS);
}

export function stopDemo(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (useDashboardStore.getState().connection === 'demo') {
    useDashboardStore.getState().setConnection('disconnected');
  }
}
