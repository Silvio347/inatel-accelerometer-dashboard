# TIA Portal setup: sensor on the ifm AL1306

How to add the CMSW-IOL to the existing S7-1200 project and read its values.
**[confirmed]** items come from the AL1306 GSDML or the existing TIA project;
**[to check]** items must be verified on the real equipment.

## Starting point [confirmed]

| Item | Value |
|---|---|
| CPU | S7-1214C DC/DC/DC `6ES7 214-1AG40-0XB0`, firmware **V4.2** in the project (the real CPU may be newer) |
| Engineering | TIA Portal V18 on the lab PC |
| Base project | `Treinamento Sense.ap15` (the IO-Link training kit). It is **TIA V15**: V18 asks to upgrade it. **Work on a copy.** |
| IO-Link master | ifm AL1306, PROFINET, 8 ports X01–X08. GSDML `GSDML-V2.35-ifm-AL1x0x-20230127-075900.xml` is already embedded in the project |
| Already on the master | X05 = training kit (buzzer + LED). An ifm AL2301 I/O hub on another port. Modules in the project: `IO-Link 32 I _ 32 O Byte + PQI` and `IO-Link 1 I _ 15 O Byte + PQI` |
| Existing blocks | FCs `Tratamento AL2301` and `Tratamento DV2310` |

**[to check]** By the IODDs, the AL2301 uses 30 bytes in / 30 out (needs the
32/32 module) and the DV2310 light uses 4 bytes out (fits the 1/15 module).
So the kit on X05 may be on the 1/15 module, not 32/32. Look at the *Device
view* of the AL1306 before changing anything.

The project also has an ET200SP station with a Siemens CM 4xIO-Link. **The
sensor goes on the AL1306, not on the ET200SP.**

Addresses already used by existing tags (do not reuse): %I0.0–%I1.2,
%IW88, %IB95–%IB97, %QB36–%QB39, %Q84.5, %Q85.5, %QB109–%QB111, %MB14,
%MB95–%MB97, %MD88, %MB274–%MB324.

## Which port

Any free port except X05 and the AL2301 port. **X01 is suggested** if it is
free.

- Every port accepts the module (GSDML: subslots 2–9 = X01–X08).
- The sensor is 4-pin with pin 2 not connected, so class A or B ports both
  work electrically.
- **The physical port and the port configured in TIA must be the same.**
  Cable on X01 with the module on X02 = no data (the sensor LED may still
  blink, but the PQI stays 0).
- Adding a port does not change the others. Do not touch the module on X05
  or on the AL2301 port: their addresses would move and the existing FCs
  would read the wrong bytes.

## Port configuration

1. Open the copy in V18 and upgrade it.
2. *Device view* of the AL1306 → port X01 → replace `Deactivated` with
   **`IO-Link 24 I Byte + PQI`**.
   - The GSDML has no 20-byte module. Input sizes are 1, 2, 4, 6, 8, 10, 12,
     14, 16, 18, 24 and 32. **Use 24** (32 also works). 16 or 18 gives a
     process data length error.
   - No output is needed: the sensor has no output process data.
3. *Device overview* → *I address* of the port → type **200**. This makes
   every address below predictable. If TIA reports an overlap, use another
   free value and add the difference to every address.
4. Port parameters (*Properties → Module parameters*):

| Parameter | Value |
|---|---|
| Port Mode | apply port configuration |
| Validation / Data Storage | **no Device check and clear** for the first test. After the Device ID is confirmed, *type compatible Device (V1.1)* |
| Vendor ID (VID) | 1174 (only used with validation on) |
| Device ID (DID) | 11 (**[to check]** before turning validation on) |
| Pin2 behavior | Class A / NC |
| Port Cycle Time | **as fast as possible** (the sensor needs ≥ 10 ms; 2, 4 and 8 ms are below that) |

5. Compile and download. **A hardware download puts the CPU in STOP for a
   few seconds**: the training kit stops during that time.
6. Check the sensor LED blinks at 1 Hz and the port LED on the AL1306.

## Memory map (module 24 I + PQI at %IB200)

```
%IB200 .. %IB219   20 bytes of sensor process data
%IB220 .. %IB223   rest of the 24-byte module (expected 0)
%IB224             PQI
```

With the 32-byte module the PQI is at **%IB232**. The PQI comes **after**
the data (GSDML order). **[to check]** that the master puts the 20 bytes at
the start of the port area and zeroes the rest: verify in a watch table.

PQI bits [confirmed, GSDML]:

| Bit | Name | Meaning |
|---|---|---|
| .7 | PQ | Port qualifier: **data valid** (use it to enable the logic) |
| .6 | DE | Device error |
| .5 | DC | Device present |
| .4 | PO | Port operational |
| .3 | SV | Substitute device detected |
| .2 | NP | New parameter |
| .1, .0 | | Reserved |

With the sensor talking, the PQI should read about **16#B0** (PQ, DC, PO).

## PLC tags (base %IB200)

| Name | Type | Address | Scale / note |
|---|---|---|---|
| CMSW_VelRMS_X_Raw | Int | %IW200 | × 0.01 mm/s |
| CMSW_VelRMS_Y_Raw | Int | %IW202 | × 0.01 mm/s |
| CMSW_VelRMS_Z_Raw | Int | %IW204 | × 0.01 mm/s |
| CMSW_Acc_X_Raw | Int | %IW206 | × 0.01 m/s² (RMS or peak-to-peak, see sensor doc) |
| CMSW_Acc_Y_Raw | Int | %IW208 | × 0.01 m/s² |
| CMSW_Acc_Z_Raw | Int | %IW210 | × 0.01 m/s² |
| CMSW_Temp_Raw | Int | %IW212 | × 0.01 °C |
| CMSW_Press_Raw | Int | %IW214 | **× 0.1** mbar |
| CMSW_Hum_Raw | Int | %IW216 | × 0.01 % |
| CMSW_Flags1 | Byte | %IB218 | alarm bits 15–8 |
| CMSW_Flags2 | Byte | %IB219 | alarm bits 7–0 |
| CMSW_PQI | Byte | %IB224 | %IB232 with the 32-byte module |
| CMSW_PQ_Valid | Bool | %I224.7 | data valid |
| CMSW_DevError | Bool | %I224.6 | |
| CMSW_DevPresent | Bool | %I224.5 | |
| CMSW_PortOK | Bool | %I224.4 | |

The individual alarm bits (%I218.0–%I219.7) are listed in
[sensor-cmsw-iol.md](sensor-cmsw-iol.md#alarm-bits) if you want one Bool tag
each.

For another base address: value at base + offset (0, 2, …, 16), alarm bytes
at base + 18 and base + 19, PQI at base + 24 (24-byte module) or base + 32
(32-byte module).

## Conversion to engineering units

The nine values arrive as raw Int (2534 in `CMSW_Temp_Raw` means 25.34 °C).
LAD cannot multiply an Int by 0.01 directly, so each value needs:

1. **CONV** Int → Real
2. **MUL** (Real) by the scale

Alarm bits and the PQI need no conversion: they are plain contacts/bytes.

**PLC data type `UDT_CMSW`:** `Valid` Bool, then Real `VelRMS_X_mms`,
`VelRMS_Y_mms`, `VelRMS_Z_mms`, `Acc_X_ms2`, `Acc_Y_ms2`, `Acc_Z_ms2`,
`Temp_C`, `Press_mbar`, `Hum_pct`.

**Global DB `DB_CMSW`** with one variable `Motor1 : UDT_CMSW`.

**FC `Tratamento CMSW`**, called in OB1 next to the existing FCs, with a
*Temp* variable `tmp : Real`.

LAD, one network per value:

```
Network 1: data valid
 "CMSW_PQ_Valid"                             "DB_CMSW".Motor1.Valid
 ──| |───────────────────────────────────────────( )──

Network 2: velocity RMS X (repeat for the others)
 "CMSW_PQ_Valid"    ┌──── CONV ────┐         ┌──── MUL ─────┐
 ──| |──────────────┤EN         ENO├─────────┤EN         ENO├──
                    │  Int to Real │         │     Real     │
 "CMSW_VelRMS_X_Raw"┤IN        OUT ├─ #tmp   #tmp ┤IN1   OUT ├─ "DB_CMSW".Motor1.VelRMS_X_mms
                    └──────────────┘         0.01 ┤IN2        │
                                                  └───────────┘
```

| Network | Input tag | MUL IN2 | Destination |
|---|---|---|---|
| 2 | CMSW_VelRMS_X_Raw | 0.01 | Motor1.VelRMS_X_mms |
| 3 | CMSW_VelRMS_Y_Raw | 0.01 | Motor1.VelRMS_Y_mms |
| 4 | CMSW_VelRMS_Z_Raw | 0.01 | Motor1.VelRMS_Z_mms |
| 5 | CMSW_Acc_X_Raw | 0.01 | Motor1.Acc_X_ms2 |
| 6 | CMSW_Acc_Y_Raw | 0.01 | Motor1.Acc_Y_ms2 |
| 7 | CMSW_Acc_Z_Raw | 0.01 | Motor1.Acc_Z_ms2 |
| 8 | CMSW_Temp_Raw | 0.01 | Motor1.Temp_C |
| 9 | CMSW_Press_Raw | **0.1** | Motor1.Press_mbar |
| 10 | CMSW_Hum_Raw | 0.01 | Motor1.Hum_pct |

With the `CMSW_PQ_Valid` contact in front, the values freeze at the last good
reading when the sensor drops, and `Valid` goes FALSE. Use `Valid` to block
vibration alarms.

The same in SCL:

```pascal
"DB_CMSW".Motor1.Valid := "CMSW_PQ_Valid";
IF "CMSW_PQ_Valid" THEN
    "DB_CMSW".Motor1.VelRMS_X_mms := INT_TO_REAL("CMSW_VelRMS_X_Raw") * 0.01;
    "DB_CMSW".Motor1.VelRMS_Y_mms := INT_TO_REAL("CMSW_VelRMS_Y_Raw") * 0.01;
    "DB_CMSW".Motor1.VelRMS_Z_mms := INT_TO_REAL("CMSW_VelRMS_Z_Raw") * 0.01;
    "DB_CMSW".Motor1.Acc_X_ms2    := INT_TO_REAL("CMSW_Acc_X_Raw")    * 0.01;
    "DB_CMSW".Motor1.Acc_Y_ms2    := INT_TO_REAL("CMSW_Acc_Y_Raw")    * 0.01;
    "DB_CMSW".Motor1.Acc_Z_ms2    := INT_TO_REAL("CMSW_Acc_Z_Raw")    * 0.01;
    "DB_CMSW".Motor1.Temp_C       := INT_TO_REAL("CMSW_Temp_Raw")     * 0.01;
    "DB_CMSW".Motor1.Press_mbar   := INT_TO_REAL("CMSW_Press_Raw")    * 0.1;
    "DB_CMSW".Motor1.Hum_pct      := INT_TO_REAL("CMSW_Hum_Raw")      * 0.01;
END_IF;
```

An alarm can also compare the raw Int with the limit times the scale, with no
conversion. Example: alarm above 4.5 mm/s = `CMSW_VelRMS_X_Raw > 450`, plus
a TON of a few seconds.

## Watch table check (before trusting the program)

| Tag | Expected |
|---|---|
| CMSW_PQI | 16#B0, or at least bit .7 = 1 |
| CMSW_Temp_Raw | room temperature × 100 (25 °C → about 2500) |
| CMSW_Press_Raw | about 10130 at sea level; lower with altitude (Santa Rita do Sapucaí, about 850 m: around 9150) |
| CMSW_Hum_Raw | humidity × 100 (60 % → about 6000) |
| CMSW_VelRMS_*_Raw | near 0 with the motor stopped; rises when you tap the sensor or start the motor |
| %IB220–%IB223 | 0 |

If the temperature is absurd, or the pressure shows up where the humidity
should be, the data does not start where expected: check the base address
and that the module is really `24 I`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Sensor LED steady on | No IO-Link: wrong port mode, cable, or port deactivated |
| Process data length error in the diagnostics | Port module smaller than 20 bytes: use 24 I or 32 I |
| Device ID / validation error | Validation on with the wrong DID: go back to "no Device check" and read the real ID |
| PQI = 0 | No device on that port, wrong port in the project, or sensor not powered |
| All values 0 with PQ = 1 | Watch table reads another address than the configured one |
| Training kit stopped after the download | The module on X05 (or on the AL2301 port) changed, or an address overlaps |
| Values frozen while the motor changes | `CMSW_PQ_Valid` = 0, so the FC keeps the last values |

Next: send the values to the bridge, [plc-udp-sender.md](plc-udp-sender.md).
