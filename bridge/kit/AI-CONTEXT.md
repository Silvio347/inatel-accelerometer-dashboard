# Context for an AI assistant: motor vibration dashboard (lab test)

Paste this file into the assistant together with the error or question. The
user (Silvio) is a student on a lab PC at Inatel. Answer in Brazilian
Portuguese, directly, one step at a time, for Windows and TIA Portal V18.

Items marked **[confirmed]** come from the sensor IODD, the IO-Link master
GSDML, the existing TIA project or a real test. Items marked **[to check]**
are assumptions: verify them before treating them as facts.

The `docs` folder of this kit has the full guides. Ask the user to paste the
one you need:

| File | Content |
|---|---|
| `docs/sensor-cmsw-iol.md` | Sensor specs, wiring, process data map, alarm bits, acyclic parameters |
| `docs/tia-portal-setup.md` | AL1306 port setup, addresses, PLC tags, Int→Real conversion (LAD and SCL), watch table, troubleshooting |
| `docs/plc-udp-sender.md` | `DB_UdpTx` packet layout and the `FB_UdpSender` SCL block |
| `docs/bridge.md` | This kit: settings, firewall workaround, errors |
| `docs/mqtt-contract.md` | Topics and JSON payload |
| `docs/lab-checklist.md` | Checklist for the day |

Full source: https://github.com/Silvio347/inatel-accelerometer-dashboard (public).

## Goal and data path

Read a vibration sensor in the S7-1200 and show it on a website:

```
WEG CMSW-IOL ─M12─ ifm AL1306 port X01 ─PROFINET─ S7-1200
                                                     │ UDP 5010, 44 bytes, once per second
                                                     ▼
                                     this kit on the lab PC (bridge.py, Python without pip)
                                                     │ MQTT 3.1.1 over TLS, port 8883
                                                     ▼
                                     HiveMQ Cloud: accelerometer/data (JSON), accelerometer/source/status
                                                     │ WebSocket 8884
                                                     ▼
                                     website (Netlify), opened anywhere
```

## Equipment [confirmed]

| Item | Detail |
|---|---|
| CPU | S7-1214C DC/DC/DC `6ES7 214-1AG40-0XB0`, firmware V4.2 in the project |
| TIA | V18 on the lab PC; base project `Treinamento Sense.ap15` is V15 (work on an upgraded copy) |
| IO-Link master | ifm AL1306, PROFINET, 8 ports. **X05 = training kit (buzzer + LED), do not touch.** An ifm AL2301 hub on another port, do not touch |
| Sensor | WEG CMSW-IOL, Vendor ID 1174, Device ID 11 [to check: IODD also says 0x12], 20 bytes input, no output, min cycle 10 ms, 20–30 V, class A port |

## Key facts

- AL1306 port module: **`IO-Link 24 I Byte + PQI`** (no 20-byte module
  exists; 16/18 gives a length error). I address **200**.
- Port parameters: Port Mode = apply port configuration; Validation = no
  Device check and clear (first test); Pin2 = Class A / NC; Port Cycle Time
  = as fast as possible.
- Memory [to check in a watch table]: %IW200–%IW216 = nine Int values,
  %IB218/%IB219 = alarm bits, %IB224 = PQI (**%I224.7 = data valid**). PQI
  about 16#B0 when OK.
- Scales: everything × 0.01 except **pressure × 0.1**. Units: mm/s, m/s², °C,
  mbar, %. LAD needs CONV Int→Real then MUL.
- Acceleration offsets: IODD says RMS in the ID and peak-to-peak in the text
  [to check].
- PLC → bridge: `DB_UdpTx` **not optimized**, 44 bytes: UDInt counter, Byte
  PQI, Byte flags1, Byte flags2, Byte version = 1, nine Reals. `TCON` UDP
  local port 2000, `TUSEND` to the lab PC IP, port **5010**, `LEN := 44`.
  The SCL block was not compiled yet [to check].
- Port 5010, not 5005: the robot cell twin bridge (another project) uses 5005
  on the same PC.

## Kit files

| File | What it does |
|---|---|
| `config.bat` | Broker host/port, user, password, `TOPIC_PREFIX`, `UDP_PORT`, `PLC_IP`, `PUNCH`, CA file. Edit with Notepad |
| `isrg-root-x1.pem` | Broker root certificate (Let's Encrypt ISRG Root X1) |
| `_python.bat` | Finds Python: `python\python.exe`, then `py -3`, then `python` |
| `1-network-test.bat` | `ipconfig`, `Test-NetConnection <broker> -Port 8883/8884`, `ping <PLC>`, is UDP 5010 free |
| `2-python-test.bat` | Prints the Python and OpenSSL versions |
| `3-broker-test.bat` | `bridge.py --selftest`: TLS, login, publish to `accelerometer/bridge/selftest` |
| `4-test-with-fake-plc.bat` | `fake_plc.py` sends made-up values to 127.0.0.1:5010 and the bridge publishes them |
| `5-run-bridge.bat` | The bridge for the real PLC |

`bridge.py --help` lists every option. `-v` logs every packet.

## Test order

1. **TIA**: sensor port configured and downloaded; watch table shows PQI
   16#B0 and a sensible temperature (`docs/tia-portal-setup.md`).
2. **Conversion FC** writing `DB_CMSW`.
3. **`FB_UdpSender`** in OB1 with the lab PC IP; `connected` = TRUE and
   `Counter` counting.
4. **Kit** 1 → 2 → 3 → 4 → 5. Step 4 already proves the broker and website
   path without the PLC. The PLC sender can be tested before the sensor is
   wired: it sends zeros with PQI = 0, and the website shows "sensor not
   valid".
5. Website: connect, **Bridge: online**, values move when the sensor is
   tapped or the motor runs.

## No packets from the PLC

1. On the PLC: `connected` = TRUE? `Counter` going up? `statusTUSEND` = 0?
2. Destination IP in `FB_UdpSender` = this PC's address on the PLC network
   (step 1 of the kit), port 5010.
3. Same subnet? [to check] whether the S7-1200 bench and this PC share a network.
4. Windows Firewall: set `PLC_IP` and `PUNCH=1` in `config.bat` (no admin
   needed). With admin: `New-NetFirewallRule -DisplayName "Accelerometer dashboard bridge" -Direction Inbound -Protocol UDP -LocalPort 5010 -Action Allow`
5. `Ignoring malformed packet`: DB optimized, `LEN` ≠ 44, `Version` not 1,
   or fields in another order.

## Rules for the assistant

- Do not suggest changes to the training kit port (X05), the AL2301 port or
  the existing FCs `Tratamento AL2301` / `Tratamento DV2310`.
- A hardware download stops the CPU for a few seconds; say so before
  suggesting one.
- The broker password may be in `config.bat`; do not ask the user to paste
  it in the chat, and never put it in a command line or a public place.
- Do not disable the Windows firewall or antivirus; use `PUNCH` or ask the
  lab staff for a rule.
- Changing lab PC or PLC network settings (IP addresses) needs the professor
  or lab monitor's OK.
