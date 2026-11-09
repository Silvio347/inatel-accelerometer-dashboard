# PLC UDP sender (S7-1200)

The S7-1200 sends one 44-byte UDP packet per second to the bridge PC. This
works on CPU firmware V4.2 (Open User Communication: `TCON` + `TUSEND`).
Publishing MQTT straight from the PLC with the Siemens LMQTT library would
need firmware V4.4 or later for TLS, and internet access from the PLC.

**[to check]** The block below was written without compiling it in TIA. The
instruction and type names are the S7-1200 Open User Communication ones
(`TCON`, `TUSEND`, `TCON_IP_v4`, `TADDR_Param`). If TIA complains about a
detail, fix it with the instruction help (F1).

Prerequisite: the conversion FC and `DB_CMSW` from
[tia-portal-setup.md](tia-portal-setup.md#conversion-to-engineering-units).

## Packet layout

Global DB **`DB_UdpTx`**. In the DB properties, **untick *Optimized block
access*** so the offsets are fixed and match the bridge. Inside, one
variable `Packet` of type Struct:

| Name | Type | Offset | Source |
|---|---|---|---|
| Counter | UDInt | 0.0 | +1 on every send |
| PQI | Byte | 4.0 | `"CMSW_PQI"` |
| Flags1 | Byte | 5.0 | `"CMSW_Flags1"` (%IB218, alarm bits 15–8) |
| Flags2 | Byte | 6.0 | `"CMSW_Flags2"` (%IB219, alarm bits 7–0) |
| Version | Byte | 7.0 | constant **1** (the bridge drops packets with another value) |
| VelX | Real | 8.0 | `"DB_CMSW".Motor1.VelRMS_X_mms` |
| VelY | Real | 12.0 | `...VelRMS_Y_mms` |
| VelZ | Real | 16.0 | `...VelRMS_Z_mms` |
| AccX | Real | 20.0 | `...Acc_X_ms2` |
| AccY | Real | 24.0 | `...Acc_Y_ms2` |
| AccZ | Real | 28.0 | `...Acc_Z_ms2` |
| Temp | Real | 32.0 | `...Temp_C` |
| Press | Real | 36.0 | `...Press_mbar` |
| Hum | Real | 40.0 | `...Hum_pct` |

**Total 44 bytes.** After compiling, check the *Offset* column: the last
field must be at 40.0. In Python the format is `>IBBBB9f` (big-endian, as
the S7). Keep this table, `bridge/bridge.py` and `bridge/fake_plc.py` in
sync.

## FB `FB_UdpSender` (SCL)

*Static* variables:

| Name | Type |
|---|---|
| instTCON | TCON |
| instTUSEND | TUSEND |
| tmrRetry | TON_TIME |
| tmrSend | TON_TIME |
| cfg | TCON_IP_v4 |
| dest | TADDR_Param |
| connected | Bool |
| statusTCON | Word |
| statusTUSEND | Word |

Code:

```pascal
// ---- 1) Local UDP endpoint ----
#cfg.InterfaceId := "Local~PROFINET_interface_1"; // system constant (usually 64)
#cfg.ID := 16#0A;                 // connection ID; must not repeat another TCON in the project
#cfg.ConnectionType := 16#13;     // 19 = UDP
#cfg.ActiveEstablished := FALSE;  // [to check] if TCON reports a parameter error, try TRUE
#cfg.RemoteAddress.ADDR[1] := 0;
#cfg.RemoteAddress.ADDR[2] := 0;
#cfg.RemoteAddress.ADDR[3] := 0;
#cfg.RemoteAddress.ADDR[4] := 0;
#cfg.RemotePort := 0;
#cfg.LocalPort := 2000;           // PLC UDP port (PLC_LOCAL_PORT in bridge.py, used by PUNCH)

// ---- 2) Destination: the bridge PC ----
#dest.REM_IP_ADDR[1] := 192;      // <<< CHANGE to the IP of the lab PC (ipconfig)
#dest.REM_IP_ADDR[2] := 168;
#dest.REM_IP_ADDR[3] := 0;
#dest.REM_IP_ADDR[4] := 100;
#dest.REM_PORT_NR := 5010;        // UDP_PORT in the bridge

// ---- 3) Open the connection, retry every 5 s ----
#tmrRetry(IN := NOT #connected AND NOT #tmrRetry.Q, PT := T#5S);
#instTCON(REQ := #tmrRetry.Q, ID := #cfg.ID, CONNECT := #cfg);
IF #instTCON.DONE THEN
    #connected := TRUE;
END_IF;
IF #instTCON.ERROR THEN
    #statusTCON := #instTCON.STATUS;
    IF #instTCON.STATUS = 16#80A3 THEN  // [to check] "connection already exists"
        #connected := TRUE;
    END_IF;
END_IF;

// ---- 4) Fill and send once per second ----
#tmrSend(IN := NOT #tmrSend.Q, PT := T#1S);
IF #tmrSend.Q AND #connected THEN
    "DB_UdpTx".Packet.Counter := "DB_UdpTx".Packet.Counter + 1;
    "DB_UdpTx".Packet.PQI     := "CMSW_PQI";
    "DB_UdpTx".Packet.Flags1  := "CMSW_Flags1";
    "DB_UdpTx".Packet.Flags2  := "CMSW_Flags2";
    "DB_UdpTx".Packet.Version := 1;
    "DB_UdpTx".Packet.VelX  := "DB_CMSW".Motor1.VelRMS_X_mms;
    "DB_UdpTx".Packet.VelY  := "DB_CMSW".Motor1.VelRMS_Y_mms;
    "DB_UdpTx".Packet.VelZ  := "DB_CMSW".Motor1.VelRMS_Z_mms;
    "DB_UdpTx".Packet.AccX  := "DB_CMSW".Motor1.Acc_X_ms2;
    "DB_UdpTx".Packet.AccY  := "DB_CMSW".Motor1.Acc_Y_ms2;
    "DB_UdpTx".Packet.AccZ  := "DB_CMSW".Motor1.Acc_Z_ms2;
    "DB_UdpTx".Packet.Temp  := "DB_CMSW".Motor1.Temp_C;
    "DB_UdpTx".Packet.Press := "DB_CMSW".Motor1.Press_mbar;
    "DB_UdpTx".Packet.Hum   := "DB_CMSW".Motor1.Hum_pct;
END_IF;

#instTUSEND(REQ := #tmrSend.Q AND #connected,
            ID := #cfg.ID,
            LEN := 44,
            DATA := "DB_UdpTx".Packet,
            ADDR := #dest);
IF #instTUSEND.ERROR THEN
    #statusTUSEND := #instTUSEND.STATUS;
END_IF;
```

Call it in **OB1** (instance `IDB_UdpSender`) next to the existing FCs. It
only reads values; nothing in the existing program depends on it.

Alternative for `cfg`: select the `TCON` instance → *Properties →
Configuration*, choose *UDP*, partner *Unspecified*, local port 2000. TIA
creates the parameter DB by itself.

The sensor does not need to be wired to test this: the PLC sends zeros with
PQI = 0, and the dashboard shows "sensor not valid". That already proves the
PLC → bridge → broker → website path.

## Checking it on the PLC

Watch table with `connected`, `statusTCON`, `statusTUSEND` and
`"DB_UdpTx".Packet.Counter`:

- `connected` = TRUE and `Counter` going up about once per second.
- `statusTUSEND` stays 0. Look up any STATUS code with F1 on `TCON` /
  `TUSEND`.

## Network

- The PLC and the bridge PC must be on the same subnet, or the CPU needs the
  router configured. **[to check]** whether the S7-1200 bench is on the same
  network as the lab PC.
- The bridge listens on **UDP 5010**. Port 5005 is used by the robot cell
  twin bridge, so both can run on the same PC.
- Windows Firewall may block the incoming packets; the bridge has a
  workaround without admin rights (`PUNCH=1`, see [bridge.md](bridge.md)).
