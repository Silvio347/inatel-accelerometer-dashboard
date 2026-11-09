# Website deploy (Netlify)

The build output (`dist/`) is a static site.

1. Netlify → Add new site → Import an existing project → GitHub →
   `Silvio347/inatel-accelerometer-dashboard`, branch `main`.
2. `netlify.toml` already sets the build command (`npm run build`), the
   publish folder (`dist`) and Node 20.
3. Site configuration → Environment variables:
   - `VITE_MQTT_URL` = `wss://<cluster-id>.s1.eu.hivemq.cloud:8884/mqtt`
   - `VITE_TOPIC_PREFIX` = `accelerometer`
4. Deploy. Every push to `main` deploys again.

`VITE_*` values end up in the public JavaScript bundle. They hold the broker
URL only, never a password: the user types the credential in the browser,
and it is not stored.

## Credential for the website

Create in HiveMQ Cloud → Access Management a credential that can only
**subscribe** to `accelerometer/#`, and use it on the website. The bridge
credential can publish; keep it on the lab PC only.

## Check it

- Open `https://<site>.netlify.app/?demo`: the dashboard starts in demo mode
  with made-up data, no broker needed.
- Open the site on a phone (mobile data, not the lab network), connect with
  the subscribe-only credential and check **Broker: connected**. With the
  bridge running (fake or real PLC), **Bridge: online** and the values move.
