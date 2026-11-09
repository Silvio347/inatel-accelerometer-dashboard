# WEG CMSW-IOL vibration sensor

Everything the project needs to know about the sensor. Values marked
**[confirmed]** come from the sensor IODD (`WEG-CMSW0002-20220930-IODD1.1.xml`),
the WEG installation guide (doc. 10009671472) or the ifm AL1306 GSDML.
Values marked **[to check]** are assumptions or contradictions in the vendor
files. The IODD and GSDML are vendor files and are not stored in this
repository; download them from the WEG site or the
[IODD Finder](https://ioddfinder.io-link.com) and from the ifm AL1306 page.

## Identification

| Item | Value |
|---|---|
| Manufacturer | WEG (IODD vendor name: *WEG WDC - Automacao Ltda.*) |
| Product | CMSW-IOL (Condition Monitoring Sensor WEG, IO-Link version) |
| Serial number of the unit on hand | 1078703973 (read from a photo, check on the part) |
| Product name in the IODD | `CMSW-IOL-VATP-M67-C51M12-IND` |
| Product ID in the IODD | `CMSW0002`: version **with membrane** (humidity and pressure) |
| Vendor ID | **1174** (16#0496) [confirmed] |
| Device ID | **11** in the `deviceId` attribute [to check: a comment next to it says `0x000012`] |
| IO-Link | V1.1, COM3 (230.4 kBaud), minimum cycle time **10 ms**, no SIO mode [confirmed] |

There are two variants: 0001 without membrane (IP68/IP69K) and 0002 with
membrane (measures humidity and ambient pressure). The IODD on hand is for
0002. **[to check]** If the real sensor is a 0001, get its IODD; the process
data may differ.

## Specifications (installation guide)

| Item | Value |
|---|---|
| Supply | 20 to 30 V DC, < 7 mA at 24 V |
| Master port | Class A |
| Cable | up to 20 m, M12 A-coded 4-pin, wired 1:1 |
| Accelerometer | MEMS, 3 axes, ±2/±4/±8/±16 g (parameter index 79) |
| Sampling rate | 26 667 Hz, frequency response up to about 6 kHz |
| Contact temperature | 0.01 °C resolution, ±0.5 °C accuracy |
| Humidity (0002 only) | 0.01 % resolution, ±0.2 % accuracy (20 to 60 °C) |
| Pressure (0002 only) | 0.1 hPa resolution, ±1 hPa accuracy (0 to 65 °C) |
| Housing | Stainless steel, < 100 g, two M3 screws (Ø 3.4 mm holes) |
| Temperature | −20 to +80 °C (operation, contact, storage) |
| Protection | IP67 (IP68/IP69K without membrane) |

## Wiring (M12 male, 4 pins) [confirmed]

| Pin | Colour | Signal |
|---|---|---|
| 1 | Brown | L+ (20–30 V) |
| 2 | White | NC |
| 3 | Blue | L− (0 V) |
| 4 | Black | C/Q (IO-Link) |

| Blue LED | Meaning |
|---|---|
| Blinking 1 Hz | IO-Link communication active |
| Blinking 4 Hz | Acquiring raw accelerometer data |
| Steady on | No IO-Link communication |
| Off | Erasing data |

## Mounting on the motor

- Screw it directly to the frame with the two M3 screws (WEG recommends
  screws over glue or tape for a better signal).
- Align one axis with the main force direction of the machine. Write down
  which axis ended up radial horizontal, radial vertical and axial; the X/Y/Z
  values mean nothing without it.
- Good practice (not from the guide): close to the bearing, clean and flat
  surface, no thick paint.
- Do not cover the membrane (variant 0002).
- Surface at most 80 °C. Switch the machine off and let it cool before
  mounting.

## Process data input [confirmed]

**160 bits = 20 bytes**: nine signed 16-bit values and two bytes of alarm
bits. Big-endian, the same as the S7, so no byte swap is needed. There is no
output process data.

| Byte offset | S7 type | Value | Scale | Unit |
|---|---|---|---|---|
| 0–1 | Int | Velocity RMS X | × 0.01 | mm/s |
| 2–3 | Int | Velocity RMS Y | × 0.01 | mm/s |
| 4–5 | Int | Velocity RMS Z | × 0.01 | mm/s |
| 6–7 | Int | Acceleration X (see note) | × 0.01 | m/s² |
| 8–9 | Int | Acceleration Y | × 0.01 | m/s² |
| 10–11 | Int | Acceleration Z | × 0.01 | m/s² |
| 12–13 | Int | Contact temperature | × 0.01 | °C |
| 14–15 | Int | Ambient pressure | **× 0.1** | mbar (= hPa) |
| 16–17 | Int | Ambient humidity | × 0.01 | % |
| 18 | Byte | Alarm bits | | |
| 19 | Byte | Alarm bits | | |

Units: IO-Link unit codes 1062 = mm/s, 1076 = m/s², 1001 = °C, 1138 = mbar,
1342 = %.

**[to check] Acceleration, offsets 6–11.** The IODD identifiers say
`Accel_RMS_X/Y/Z`, but the displayed text says "Acceleration Peak-to-Peak
X/Y/Z". The file contradicts itself. Compare with acyclic index 92
(acceleration peak-to-peak) in an IO-Link tool: if they match, it is
peak-to-peak. For a sine wave, peak-to-peak is about 2.83 × RMS.

### Alarm bits

Numbered by IODD `bitOffset`. As one 16-bit number,
`flags = byte18 × 256 + byte19`, the bit number below is the bit of `flags`.

| Bit | S7 address (port at %IB200) | Meaning |
|---|---|---|
| 15 | %I218.7 | not used |
| 14 | %I218.6 | Contact temperature below limit |
| 13 | %I218.5 | Contact temperature above limit |
| 12 | %I218.4 | Humidity below limit |
| 11 | %I218.3 | Humidity above limit |
| 10 | %I218.2 | Pressure below limit |
| 9 | %I218.1 | Pressure above limit |
| 8 | %I218.0 | Velocity RMS X above limit |
| 7 | %I219.7 | Velocity RMS Y above limit |
| 6 | %I219.6 | Velocity RMS Z above limit |
| 5 | %I219.5 | Acceleration RMS X above limit |
| 4 | %I219.4 | Acceleration RMS Y above limit |
| 3 | %I219.3 | Acceleration RMS Z above limit |
| 2 | %I219.2 | Acceleration peak-to-peak X above limit |
| 1 | %I219.1 | Acceleration peak-to-peak Y above limit |
| 0 | %I219.0 | Acceleration peak-to-peak Z above limit |

The limits live inside the sensor (acyclic parameters below). If nobody sets
them, the bits may never turn on. Alarms can be done in the PLC or on the
dashboard instead.

## Acyclic parameters [confirmed index list]

Not part of the process data. Read and written by index with an IO-Link tool
(ifm moneo / LR DEVICE) or from the PLC with the `IO_LINK_DEVICE` block of
the Siemens IO-Link Library (the copy on hand is V14/V15; get a version for
TIA V18). **[to check]** The scale of each parameter was not collected; read
it in the IODD (for example with the IO-Link Community IODD Viewer) before
writing values.

| Index | Access | Content |
|---|---|---|
| 65 | ro | Operating hours (UInt32) |
| 67 | rw | Alarm setup: delay before monitoring starts, % for automatic thresholds |
| 69 / 71 | rw | Low/high limit + enable: temperature / contact temperature |
| 73 / 75 | rw | Low/high limit + enable: humidity / pressure |
| 79 | rw | Accelerometer full scale (±2/4/8/16 g) |
| 81 | rw | Time window of the statistical values |
| 84 | rw | Velocity RMS limits X/Y/Z (10 to 13000) + enable per axis |
| 85 | rw | Velocity severity ranges I, II, III + enable |
| 86 | rw | Acceleration RMS limits X/Y/Z + enable |
| 87–89 | ro | Statistics per axis: mean, standard deviation, crest factor |
| 90 | rw | Acceleration peak-to-peak limits X/Y/Z + enable |
| 91 | ro | FFT: frequency bin and magnitude of the peak per axis |
| 92 | ro | Acceleration peak-to-peak X/Y/Z |
| 93–95 | ro | History of maximum velocity RMS per axis |
| 100–102 | rw/ro | Raw data acquisition setup and status |

## Reading the vibration values

- The main quantity for alarms is **velocity RMS in mm/s**. Severity zones
  come from ISO 20816-3 (machines above 15 kW) or ISO 10816-1 (small
  machines); the dashboard has a machine class selector with reference
  limits. Check the class of the real motor.
- Better than fixed limits: record a baseline with the motor healthy and
  alarm above it, with a delay so the start-up transient does not trigger.
- Acceleration and contact temperature help to catch bearing faults and
  looseness.
