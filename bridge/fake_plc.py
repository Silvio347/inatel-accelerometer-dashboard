"""Fake PLC: sends made-up sensor values as FB_UdpSender packets.

Tests the whole bridge -> broker -> website path without the S7-1200:

  python fake_plc.py                      send to 127.0.0.1:5010 forever
  python fake_plc.py --host 192.168.0.5   send to another PC
  python fake_plc.py --invalid            send with PQI bit 7 = 0 (sensor not valid)

Standard library only. The packet layout matches docs/plc-udp-sender.md.
The values imitate a motor that runs 120 s, stops 40 s, and has a vibration
episode on axis X in runs 1, 4, 7, ... (same rules as src/sim/demo.ts).
"""
from __future__ import annotations

import argparse
import math
import random
import socket
import struct
import time

PACKET_FORMAT = ">IBBBB9f"
LAYOUT_VERSION = 1
RUN_S, STOP_S = 120, 40
CYCLE_S = RUN_S + STOP_S
EPISODE = (50, 85)


def noise(a: float) -> float:
    return random.uniform(-a, a)


def sample(t: float, temp: float) -> tuple[list[float], float, int]:
    cycle, in_cycle = divmod(t, CYCLE_S)
    running = in_cycle < RUN_S
    speed = min(1.0, in_cycle / 5) if running else 0.0
    episode = running and int(cycle) % 3 == 1 and EPISODE[0] <= in_cycle < EPISODE[1]
    gain = 1 + 3 * math.sin(math.pi * (in_cycle - EPISODE[0]) / (EPISODE[1] - EPISODE[0])) if episode else 1
    vel = [max(0.0, speed * (b + noise(0.08)) + noise(0.02)) for b in (1.1 * gain, 0.85, 0.5)]
    acc = [max(0.0, v * (2.6 if i == 0 and episode else 1.7) + noise(0.05)) for i, v in enumerate(vel)]
    target = 41.0 if running else 24.0
    temp += (target - temp) * (1 - math.exp(-1 / 180))
    flags = 0
    for bit, v in zip((8, 7, 6), vel):
        if v > 4.5:
            flags |= 1 << bit
    reals = vel + acc + [temp + noise(0.05), 915.4 + noise(0.3), 58 + 3 * math.sin(t / 900) + noise(0.1)]
    return reals, temp, flags


def main() -> None:
    p = argparse.ArgumentParser(description="Send made-up sensor packets like the S7-1200 does.")
    p.add_argument("--host", default="127.0.0.1", help="bridge address (default 127.0.0.1)")
    p.add_argument("--port", type=int, default=5010, help="bridge UDP port (default 5010)")
    p.add_argument("--period", type=float, default=1.0, help="seconds between packets (default 1)")
    p.add_argument("--invalid", action="store_true", help="report the sensor data as not valid (PQI = 0)")
    args = p.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    start, seq, temp = time.monotonic(), 0, 24.0
    print(f"Sending fake sensor packets to {args.host}:{args.port} every {args.period:g} s. Ctrl+C to stop.")
    try:
        while True:
            reals, temp, flags = sample(time.monotonic() - start, temp)
            seq = (seq + 1) % 2**32
            pqi = 0x00 if args.invalid else 0xB0  # PQ + DC + PO
            packet = struct.pack(PACKET_FORMAT, seq, pqi, flags >> 8, flags & 0xFF, LAYOUT_VERSION, *reals)
            sock.sendto(packet, (args.host, args.port))
            time.sleep(args.period)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
