# Lab day checklist

## Sensor mounting

Agree with whoever mounts the sensor on the motor beforehand:

- [ ] Which motor and which point (close to the bearing, flat and rigid surface)
- [ ] Surface temperature at that point (sensor rated up to **80 °C**)
- [ ] Fixing with **two M3 screws** (WEG recommends screws, not glue or tape)
- [ ] Orientation of X/Y/Z: write down which is radial horizontal, radial vertical and axial
- [ ] Cable route to the AL1306 (at most **20 m**)
- [ ] Which AL1306 port the sensor uses (suggested X01; not X05, not the AL2301 port)

## Before going

- [ ] Kit built: `python3 bridge/make_kit.py` → `bridge/dist/accelerometer-bridge-kit.zip` on a USB drive
- [ ] Copy of the TIA project (`Treinamento Sense.ap15`) and the sensor IODD on the drive
- [ ] Website open somewhere to watch the data (Netlify, or `npm run dev`)

## At the lab

TIA Portal ([tia-portal-setup.md](tia-portal-setup.md)):

- [ ] Project copy opened and upgraded to V18
- [ ] Which module is on which AL1306 port (kit on X05? AL2301 where?)
- [ ] Sensor on X01 with `IO-Link 24 I Byte + PQI`, I address 200, downloaded; the training kit still works
- [ ] Watch table: PQI about 16#B0, temperature makes sense, %IB220–%IB223 = 0
- [ ] Device ID read from the sensor (11 or 16#12?)
- [ ] Variant of the sensor (0002 with membrane?)
- [ ] Conversion FC writing `DB_CMSW`

PLC sender ([plc-udp-sender.md](plc-udp-sender.md)):

- [ ] `DB_UdpTx` not optimized, last offset 40.0, `Version` = 1
- [ ] `FB_UdpSender` with the lab PC IP, called in OB1
- [ ] `connected` = TRUE, `Counter` going up

Bridge ([bridge.md](bridge.md)):

- [ ] `1-network-test.bat`: write down the PC IP on the PLC network and the PLC IP
- [ ] `PLC_IP` and `PUNCH=1` in `config.bat`
- [ ] `3-broker-test.bat` OK
- [ ] `4-test-with-fake-plc.bat` shows data on the website
- [ ] `5-run-bridge.bat`: `Source status: online`, website shows the real values
- [ ] Tap the sensor / start the motor: velocity goes up on the website

After:

- [ ] Find out whether the acceleration values are RMS or peak-to-peak (compare with index 92)
- [ ] Record a baseline with the motor healthy
- [ ] Change the broker password used in the kit, or make a lab-only credential
