# Bridge

Receives the S7-1200 UDP packets (`FB_UdpSender`) and publishes them to the
MQTT broker. Runs on the PC connected to the PLC. Standard library only.

| File | Role |
|---|---|
| `bridge.py` | The bridge (`--selftest` checks the broker only) |
| `fake_plc.py` | Sends made-up sensor packets, to test without the PLC |
| `make_kit.py` | Builds `dist/accelerometer-bridge-kit.zip` for the lab PC (portable Python + `.bat` tests + docs) |
| `kit/` | Files copied into the kit, including `AI-CONTEXT.md` |

```bash
python3 bridge/make_kit.py        # kit for the lab PC
MQTT_HOST=<cluster-id>.s1.eu.hivemq.cloud python3 bridge/bridge.py
```

Details: [docs/bridge.md](../docs/bridge.md).
