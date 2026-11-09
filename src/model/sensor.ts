// WEG CMSW-IOL sensor and ifm AL1306 port facts used by the website.
// Source: IODD WEG-CMSW0002-20220930-IODD1.1.xml and the AL1306 GSDML.
// Details: docs/sensor-cmsw-iol.md.

export const AXES = ['X', 'Y', 'Z'] as const;
export type Axis = (typeof AXES)[number];

/**
 * The 15 alarm bits at the end of the sensor process data, as one 16-bit
 * number: `flags = byte18 << 8 | byte19`. Bit = IODD bitOffset.
 * The thresholds live inside the sensor (acyclic parameters); if nobody set
 * them, these bits stay 0.
 */
export const SENSOR_FLAGS: { bit: number; label: string }[] = [
  { bit: 14, label: 'Contact temperature below limit' },
  { bit: 13, label: 'Contact temperature above limit' },
  { bit: 12, label: 'Humidity below limit' },
  { bit: 11, label: 'Humidity above limit' },
  { bit: 10, label: 'Pressure below limit' },
  { bit: 9, label: 'Pressure above limit' },
  { bit: 8, label: 'Velocity RMS X above limit' },
  { bit: 7, label: 'Velocity RMS Y above limit' },
  { bit: 6, label: 'Velocity RMS Z above limit' },
  { bit: 5, label: 'Acceleration RMS X above limit' },
  { bit: 4, label: 'Acceleration RMS Y above limit' },
  { bit: 3, label: 'Acceleration RMS Z above limit' },
  { bit: 2, label: 'Acceleration peak-to-peak X above limit' },
  { bit: 1, label: 'Acceleration peak-to-peak Y above limit' },
  { bit: 0, label: 'Acceleration peak-to-peak Z above limit' },
];

/** Port Qualifier Information byte added by the AL1306 after the process data. */
export const PQI_BITS: { bit: number; label: string; good: boolean }[] = [
  { bit: 7, label: 'Process data valid (PQ)', good: true },
  { bit: 6, label: 'Device error (DE)', good: false },
  { bit: 5, label: 'Device present (DC)', good: true },
  { bit: 4, label: 'Port operational (PO)', good: true },
  { bit: 3, label: 'Substitute device (SV)', good: false },
  { bit: 2, label: 'New parameter (NP)', good: false },
];

export const PQI_VALID_BIT = 7;

export function bitSet(value: number, bit: number): boolean {
  return ((value >> bit) & 1) === 1;
}

/**
 * Vibration severity zones for velocity RMS in mm/s (A/B, B/C, C/D limits).
 * Reference values only: confirm the group and foundation of the real motor.
 * Group 1 and 2 follow ISO 20816-3 (formerly ISO 10816-3); small machines
 * below 15 kW are not covered by part 3, so class I of ISO 10816-1 is offered.
 */
export interface MachineClass {
  id: string;
  label: string;
  limits: [number, number, number];
}

export const MACHINE_CLASSES: MachineClass[] = [
  { id: 'small', label: 'Small machine up to 15 kW (ISO 10816-1 class I)', limits: [0.71, 1.8, 4.5] },
  { id: 'g2-rigid', label: 'Medium 15–300 kW, rigid base (ISO 20816-3 group 2)', limits: [1.4, 2.8, 4.5] },
  { id: 'g2-flexible', label: 'Medium 15–300 kW, flexible base (ISO 20816-3 group 2)', limits: [2.3, 4.5, 7.1] },
  { id: 'g1-rigid', label: 'Large 300 kW–50 MW, rigid base (ISO 20816-3 group 1)', limits: [2.3, 4.5, 7.1] },
  { id: 'g1-flexible', label: 'Large 300 kW–50 MW, flexible base (ISO 20816-3 group 1)', limits: [3.5, 7.1, 11.0] },
];

export const DEFAULT_MACHINE_CLASS = 'small';

export type Zone = 'A' | 'B' | 'C' | 'D';

export const ZONE_TEXT: Record<Zone, string> = {
  A: 'A: new machine condition',
  B: 'B: acceptable for long-term operation',
  C: 'C: not acceptable for long-term operation',
  D: 'D: may cause damage',
};

export function zoneOf(velocityRms: number, limits: [number, number, number]): Zone {
  if (velocityRms < limits[0]) return 'A';
  if (velocityRms < limits[1]) return 'B';
  if (velocityRms < limits[2]) return 'C';
  return 'D';
}

export function findMachineClass(id: string): MachineClass {
  return MACHINE_CLASSES.find((c) => c.id === id) ?? MACHINE_CLASSES[0]!;
}
