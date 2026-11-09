export const config = {
  defaultMqttUrl: import.meta.env.VITE_MQTT_URL ?? '',
  topicPrefix: import.meta.env.VITE_TOPIC_PREFIX ?? 'accelerometer',
  /** The PLC sends one packet per second; data older than this is shown as stale. */
  staleAfterMs: 5000,
  /** Samples kept in memory for the trend charts (1 hour at 1 sample/s). */
  historyMax: 3600,
} as const;
