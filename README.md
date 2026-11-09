# Motor Vibration Dashboard

Live dashboard for a WEG CMSW-IOL IO-Link vibration sensor mounted on a
motor, read by a Siemens S7-1200 through an ifm AL1306 IO-Link master. The
PLC sends the values over UDP to a Python bridge on the lab PC, which
publishes them to HiveMQ Cloud; this website subscribes over WebSockets.

```
Sensor → AL1306 → S7-1200 ─UDP→ bridge.py (lab PC) ─MQTT/TLS→ HiveMQ Cloud ─WSS→ website
```

The website shows velocity RMS and acceleration per axis with ISO severity
zones, contact temperature, ambient pressure and humidity, trend charts, the
IO-Link port status and the sensor alarm bits.

Project overview and setup guides: [docs/README.md](docs/README.md).

## Requirements

- Node.js 18.18+ (20 LTS recommended)
- Python 3.8+ for the bridge (standard library only)

## Setup

```bash
npm install
cp .env.example .env.local   # broker URL and topic prefix
npm run dev
```

Open the printed URL, then enter a broker username and password, or click
**Run demo without broker**. `?demo` in the URL starts the demo directly.

## Test the whole path without the PLC

```bash
# terminal 1: the bridge (asks for the broker password)
MQTT_HOST=<cluster-id>.s1.eu.hivemq.cloud MQTT_USERNAME=<user> python3 bridge/bridge.py
# terminal 2: a fake PLC sending made-up values to 127.0.0.1:5010
python3 bridge/fake_plc.py
```

Then connect the website to the broker: **Bridge: online** and moving values.

## Lab PC kit

```bash
python3 bridge/make_kit.py   # → bridge/dist/accelerometer-bridge-kit.zip
```

A zip with the bridge, a portable Python, numbered `.bat` tests, the setup
docs and `AI-CONTEXT.md` for an AI assistant on the lab PC. It holds the
broker host and maybe the password: not in git, do not share. See
[docs/bridge.md](docs/bridge.md).

## Build and deploy

```bash
npm run build      # type-check + production build into dist/
```

Netlify: [docs/website-deploy.md](docs/website-deploy.md).

## Repository layout

```
src/        Website (React + TypeScript + Vite)
bridge/     UDP → MQTT bridge, fake PLC, lab PC kit
docs/       Sensor, TIA Portal, PLC sender, bridge, MQTT contract, deploy
```
