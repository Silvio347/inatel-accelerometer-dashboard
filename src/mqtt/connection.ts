// Single MQTT connection for the whole app. The dashboard is read-only: it
// only subscribes and never publishes.
import mqtt, { type MqttClient } from 'mqtt';
import { parseSample, parseSourceStatus } from '../model/messages';
import { useDashboardStore } from '../state/store';
import { topics } from './topics';

export interface BrokerCredentials {
  url: string;
  username: string;
  password: string;
}

// CONNACK return codes 4 (bad user/password) and 5 (not authorized).
const AUTH_ERROR_CODES = new Set([4, 5]);

let client: MqttClient | null = null;

function handleMessage(topic: string, payload: string): void {
  const store = useDashboardStore.getState();
  if (topic === topics.data) {
    const sample = parseSample(payload, Date.now());
    if (sample) store.addSample(sample);
    else console.warn('[mqtt] Ignoring malformed data payload', payload);
    return;
  }
  if (topic === topics.sourceStatus) {
    store.setSource(parseSourceStatus(payload));
  }
}

export function connectBroker({ url, username, password }: BrokerCredentials): void {
  disconnectBroker();
  const store = useDashboardStore.getState();
  store.reset();
  store.setError(null);
  store.setConnection('connecting');

  const c = mqtt.connect(url, {
    username,
    password,
    clientId: `accel-web-${Math.random().toString(16).slice(2, 10)}`,
    protocolVersion: 4,
    clean: true,
    keepalive: 15,
    reconnectPeriod: 3000,
    connectTimeout: 10_000,
  });
  client = c;

  c.on('connect', () => {
    store.setConnection('connected');
    store.setError(null);
    c.subscribe(topics.all, { qos: 1 }, (err) => {
      if (err) store.setError(`Subscribe failed: ${err.message}`);
    });
  });
  c.on('reconnect', () => store.setConnection('reconnecting'));
  c.on('close', () => {
    // Only report a drop for the active client; disconnectBroker() clears `client` first.
    if (client === c) useDashboardStore.getState().setConnection('reconnecting');
  });
  c.on('error', (err) => {
    const code = (err as { code?: unknown }).code;
    useDashboardStore.getState().setError(err.message);
    if (typeof code === 'number' && AUTH_ERROR_CODES.has(code)) {
      // Retrying with wrong credentials only spams the broker.
      disconnectBroker();
      useDashboardStore.getState().setError('Broker rejected the credentials.');
    }
  });
  c.on('message', (topic, buffer) => handleMessage(topic, buffer.toString()));
}

export function disconnectBroker(): void {
  const c = client;
  client = null;
  useDashboardStore.getState().setConnection('disconnected');
  c?.end(true);
}
