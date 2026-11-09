# MQTT contract

All topics live under a configurable prefix (default `accelerometer`),
separate from other projects on the same HiveMQ broker (`robotcell/...`,
Fluxio's `device/<id>/...`).

The website only **subscribes** (`accelerometer/#`). Nothing in this project
sends anything to the PLC.

| Topic | Publisher | Retained | Rate |
|---|---|---|---|
| `accelerometer/data` | bridge | no | one message per PLC packet, about 1 per second |
| `accelerometer/source/status` | bridge (also its Last Will) | yes | on change, on connect / disconnect |
| `accelerometer/bridge/selftest` | `bridge.py --selftest` | no | on demand |

The website marks data older than 5 s as stale.

## `accelerometer/data`

```json
{
  "ts": 1794231600212,
  "seq": 12,
  "pqi": 176,
  "flags": 0,
  "velocityRms": [1.23, 0.5, 0.7],
  "acceleration": [2.1, 1.9, 2.2],
  "temperature": 25.34,
  "pressure": 915.4,
  "humidity": 60.5
}
```

| Field | Type | Meaning |
|---|---|---|
| `ts` | number | Milliseconds since epoch, clock of the bridge PC |
| `seq` | integer 0–2³²−1 | PLC packet counter. Gaps = lost packets |
| `pqi` | integer 0–255 | Port qualifier byte of the AL1306 port. **Bit 7 = data valid** |
| `flags` | integer 0–65535 | Sensor alarm bits, `byte18 × 256 + byte19` ([table](sensor-cmsw-iol.md#alarm-bits)) |
| `velocityRms` | 3 × number or null | X, Y, Z velocity RMS, mm/s |
| `acceleration` | 3 × number or null | X, Y, Z acceleration, m/s² (RMS or peak-to-peak, [to check](sensor-cmsw-iol.md#process-data-input-confirmed)) |
| `temperature` | number or null | Contact temperature, °C |
| `pressure` | number or null | Ambient pressure, mbar |
| `humidity` | number or null | Ambient humidity, % |

- `null` means the PLC sent a non-finite Real (NaN/inf).
- When `pqi` bit 7 is 0, the values are whatever the PLC has (frozen or 0):
  the website does not show them and does not chart them.
- Messages with missing or wrongly typed fields are dropped by the website
  (`src/model/messages.ts`).

## `accelerometer/source/status`

Plain text: `online`, `offline` or `simulated`. The bridge sets its MQTT
Last Will to `offline` (retained), and publishes `offline` when no PLC packet
arrived for 5 s.

Keep this file, `src/model/messages.ts`, `src/mqtt/topics.ts` and
`bridge/bridge.py` in sync.
