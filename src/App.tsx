import { ConnectPanel } from './components/ConnectPanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { StatusBar } from './components/StatusBar';
import { StatusPanel } from './components/StatusPanel';
import { TrendsPanel } from './components/TrendsPanel';
import { VibrationPanel } from './components/VibrationPanel';
import { config } from './config';
import { useNow } from './hooks/useNow';
import { useSetting } from './hooks/useSetting';
import { DEFAULT_MACHINE_CLASS, findMachineClass, MACHINE_CLASSES } from './model/sensor';
import { useDashboardStore } from './state/store';

export function App() {
  const connection = useDashboardStore((s) => s.connection);
  const latest = useDashboardStore((s) => s.latest);
  const history = useDashboardStore((s) => s.history);
  const now = useNow();
  const [machineId, setMachineId] = useSetting('accel.machineClass', DEFAULT_MACHINE_CLASS);
  const [windowSetting, setWindowSetting] = useSetting('accel.trendWindowMs', '300000');
  const machine = findMachineClass(machineId);
  const windowMs = Number(windowSetting) || 300_000;
  const fresh = latest !== null && now - latest.receivedAt <= config.staleAfterMs;
  const shown = fresh ? latest : null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Motor Vibration Dashboard</h1>
          <p className="muted small">WEG CMSW-IOL · ifm AL1306 · Siemens S7-1200</p>
        </div>
        <StatusBar now={now} />
      </header>
      {connection === 'disconnected' ? (
        <ConnectPanel />
      ) : (
        <main className="layout">
          <div className="main-col">
            {!fresh && (
              <p className="panel banner">
                {latest ? 'Data is stale: no packet from the PLC in the last few seconds.' : 'Waiting for data from the bridge…'}
              </p>
            )}
            {shown && !shown.valid && (
              <p className="panel banner banner-error">
                The PLC is sending, but the IO-Link port reports the sensor data as not valid (PQI bit 7 = 0). Check
                the sensor cable, the port configuration and the sensor LED.
              </p>
            )}
            <VibrationPanel sample={shown} machine={machine} />
            <TrendsPanel
              history={history}
              now={now}
              machine={machine}
              windowMs={windowMs}
              onWindowChange={(ms) => setWindowSetting(String(ms))}
            />
          </div>
          <aside className="side">
            <section className="panel">
              <h2>Machine class</h2>
              <select value={machine.id} onChange={(e) => setMachineId(e.target.value)} aria-label="Machine class">
                {MACHINE_CLASSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="muted small">Sets the severity zones. Pick the class of the motor under test.</p>
            </section>
            <EnvironmentPanel sample={shown} history={history} />
            <StatusPanel sample={shown} />
          </aside>
        </main>
      )}
    </div>
  );
}
