# Project overview

A website that shows, live, the vibration and temperature of a motor
measured by a WEG CMSW-IOL IO-Link sensor connected to a Siemens S7-1200
through an ifm AL1306 IO-Link master, in an Inatel lab.

## Data path

```
Sensor ──IO-Link──► AL1306 ──PROFINET──► S7-1200 ──UDP (lab LAN)──► Bridge PC ──MQTT/TLS──► HiveMQ Cloud ──WSS──► Website
```

- The PLC already has the sensor values. It only sends a small UDP packet to
  a PC on its network once per second.
- The bridge PC converts it to MQTT and is the only machine that talks to the
  internet. All connections go outbound, so no public IP is needed.
- The website subscribes to the broker. It is read-only and cannot send
  anything to the PLC.

The design follows the robot cell twin
([Silvio347/robotcell-twin](https://github.com/Silvio347/robotcell-twin)),
which uses the same lab PC and broker.

## Docs

| File | Content |
|---|---|
| [sensor-cmsw-iol.md](sensor-cmsw-iol.md) | Sensor specs, wiring, mounting, process data map, alarm bits, acyclic parameters |
| [tia-portal-setup.md](tia-portal-setup.md) | AL1306 port setup in TIA V18, addresses, tags, Int→Real conversion, watch table |
| [plc-udp-sender.md](plc-udp-sender.md) | UDP packet layout and the SCL sender block |
| [bridge.md](bridge.md) | Bridge and kit for the lab PC, firewall workaround |
| [mqtt-contract.md](mqtt-contract.md) | Topics and payloads |
| [website-deploy.md](website-deploy.md) | Netlify deploy |
| [lab-checklist.md](lab-checklist.md) | What to do on the lab day |

## Current status

| Part | Status |
|---|---|
| Sensor data map | From the IODD; addresses to confirm in a watch table |
| TIA port setup and conversion FC | Documented, to do on the lab PC |
| PLC UDP sender (SCL) | Written, not compiled yet |
| Bridge + kit | Done, tested with the fake PLC against the real broker |
| Website | Done, tested with demo mode and with the fake PLC through the broker |
| Netlify deploy | Ready (`netlify.toml`), not deployed yet |
