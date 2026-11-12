# Bridge on the lab PC

`bridge/bridge.py` receives the PLC packets on UDP and publishes them to
HiveMQ Cloud. It is standard-library Python only (no pip), and the kit ships
a portable Python, because the lab PC is locked down: no installs, probably
no admin rights.

The same design runs the robot cell twin bridge on the lab PC (Windows, user
`supervisorio`). On that PC, ports 8883 and 8884 to HiveMQ are open and the
portable Python 3.13 runs (tested 2026-11-09).

## Build the kit

On your own PC, with `.env.local` filled in (see `.env.example`):

```bash
python3 bridge/make_kit.py                       # PLC IP set later in config.bat
python3 bridge/make_kit.py --plc-ip 192.168.0.1  # or set it now (also turns on PUNCH)
```

It writes `bridge/dist/accelerometer-bridge-kit.zip` (about 11 MB, ignored by
git). The zip holds the broker host and, if `BRIDGE_MQTT_PASSWORD` is set,
the password: do not share it.

Contents: `bridge.py`, `fake_plc.py`, `config.bat`, the numbered `.bat`
tests, `isrg-root-x1.pem` (broker root certificate), `AI-CONTEXT.md`, the
setup docs in `docs/` and the portable Python in `python/`.

## On the lab PC

Unzip anywhere (Desktop, Documents or a USB drive) and run, in order:

| Script | Success looks like |
|---|---|
| `1-network-test.bat` | An IPv4 on the PLC network (goes into `FB_UdpSender`); `TcpTestSucceeded : True` on 8883; PLC ping answers (once `PLC_IP` is set); nothing listed on UDP 5010 |
| `2-python-test.bat` | `OK: Python 3.13...` |
| `3-broker-test.bat` | `OK: connected, authenticated and published to accelerometer/bridge/selftest` |
| `4-test-with-fake-plc.bat` | `Connected to ...` and `Source status: online`; the website shows moving values |
| `5-run-bridge.bat` | Same as 4, with the real PLC |

## Settings

`config.bat` sets environment variables read by `bridge.py`
(`bridge.py --help` lists them):

| Variable | Default | Meaning |
|---|---|---|
| `MQTT_HOST` | from `.env.local` | HiveMQ Cloud cluster host |
| `MQTT_PORT` | 8883 | MQTT over TLS |
| `MQTT_USERNAME`, `MQTT_PASSWORD` | from `.env.local` | Broker credential (asked for if empty) |
| `MQTT_CA_FILE` | `isrg-root-x1.pem` | Root certificate; empty = Windows store |
| `TOPIC_PREFIX` | `accelerometer` | Topic root |
| `UDP_PORT` | 5010 | Must match `REM_PORT_NR` in `FB_UdpSender` |
| `PLC_IP` | empty | When set, only packets from this IP are accepted |
| `PUNCH` | 1 if `PLC_IP` was given to `make_kit.py`, else 0 | Firewall workaround, needs `PLC_IP` |

HiveMQ Cloud has no plain (non-TLS) port, so the bridge always uses TLS.
`MQTT_TLS=0` exists only for a local test broker.

## PLC sending to port 5005

The first PLC program (written before this repository) sends to UDP 5005
instead of 5010. Either change `REM_PORT_NR` to 5010 in `FB_UdpSender`, or
set `UDP_PORT=5005` in `config.bat`. With 5005, the robot cell twin bridge
cannot run on the same PC at the same time.

Do not use the early `ponte_udp_mqtt.py` script: it publishes to
`lab/cmsw/motor1` with another JSON format, which the website does not read.

## Windows Firewall

Windows blocks incoming UDP unless a rule allows it, and adding a rule needs
admin rights. Without admin: set `PLC_IP` and `PUNCH=1` in `config.bat`. The
bridge then sends 1 byte from UDP 5010 to the PLC port 2000 every 5 s, and
Windows treats the PLC packets as replies. The PLC ignores those bytes. With
admin rights, the clean fix is:

```powershell
New-NetFirewallRule -DisplayName "Accelerometer dashboard bridge" -Direction Inbound -Protocol UDP -LocalPort 5010 -Action Allow
```

## Running it from source

```bash
MQTT_HOST=<cluster-id>.s1.eu.hivemq.cloud MQTT_USERNAME=<user> python3 bridge/bridge.py --selftest
MQTT_HOST=<cluster-id>.s1.eu.hivemq.cloud MQTT_USERNAME=<user> python3 bridge/bridge.py -v
python3 bridge/fake_plc.py            # in another terminal: fake PLC on 127.0.0.1:5010
```

The bridge asks for the password, or reads `MQTT_PASSWORD`.

## Errors

| Message | Meaning | Fix |
|---|---|---|
| `TcpTestSucceeded : False` | Port 8883 blocked by the network | Phone hotspot, or another machine |
| `bad user name or password` | Wrong credential | Check HiveMQ Cloud → Access Management |
| `not authorized` | Credential without publish rights | Allow publish on `accelerometer/#` |
| `certificate is not trusted` | `isrg-root-x1.pem` missing, CA changed, or a TLS-inspecting proxy | Check the file; try `MQTT_CA_FILE=` (empty); with a proxy, use a hotspot |
| `getaddrinfo failed` | DNS cannot resolve the broker | No internet, or wrong `MQTT_HOST` |
| `[WinError 10048]` / address in use | Another program on UDP 5010 | Close it, or change `UDP_PORT` here and `REM_PORT_NR` on the PLC |
| Connected but never `online` | No packets arrive | PLC `connected`/`Counter` (see [plc-udp-sender.md](plc-udp-sender.md#checking-it-on-the-plc)), destination IP in `FB_UdpSender`, `PUNCH` |
| `Ignoring packet from ...` | Packets from another IP than `PLC_IP` | Fix `PLC_IP` |
| `Ignoring malformed packet` | Not 44 bytes, or version byte not 0 or 1 | DB optimized, `LEN` ≠ 44, or field order wrong |
