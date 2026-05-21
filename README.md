# STATIC

Flip through strangers like dead channels. STATIC is a random, discoverable
video chat. There is no login, no database, and no server that holds your
identity. You build a profile, choose how much of it to reveal, and get paired
with whoever else is tuned to the same frequency.

Signaling, presence, and the lobby run over the public [CLASP](https://clasp.to)
relay. Camera, mic, text chat, and reactions are direct WebRTC between the two
browsers and never touch the relay.

## How it works

- **Passport.** Your whole profile (fields plus reveal settings) packs into one
  string you can copy and paste back later. It lives only in your browser.
- **Match-only fields.** Any descriptor can be used to pair you without ever
  being shown to the other person. Bucketed values drive the match; the raw
  value never leaves your machine in readable form.
- **Pairing modes.** Roulette, same wavelength, opposite, complementary,
  filter, and browse. The scoring is symmetric and pure, so two browsers agree
  on a match with no server deciding for them.
- **In call.** Peer to peer text chat, quick reactions, consent gated recording
  that notifies all parties, a connection quality readout, and a block list.

## Stack

- Vite + Vue 3, single page, client only. No backend.
- `@clasp-to/core` for the relay connection.
- `lucide-vue-next` for icons.
- Plain scoped CSS driven by centralized design tokens.

## Project layout

```
src/
  theme/        design tokens (tokens.css) and the global base (style.css)
  lib/          pure logic: constants, matching, passport, places, storage, ids
  composables/  stateful singletons: clasp, profile, theme, screen, lobby, call, app
  components/
    ui/         the design system primitives (button, panel, chip, select, etc)
    setup/      profile, age gate, relay, passport
    lobby/      frequency, mode, filter, browse cards
    call/       video tiles, controls, chat, reactions
```

The separation is deliberate. `lib` has no Vue and no DOM, so the matching logic
is testable in isolation. Composables hold all reactive state and are wired
together by `useApp`, which is the single place that knows about the transitions
between lobby and call. Components stay thin and reference design tokens rather
than hardcoded colors.

### Design system

Every color, font, and effect is a CSS custom property in `src/theme/tokens.css`.
Components never hardcode a hex value. Switching the `data-theme` attribute on
`<html>` reskins the whole app, which is how the three themes (dead channel,
amber CRT, high contrast) work. The look extracts the original pirate radio and
CRT feel into reusable primitives: hard offset shadows, the marker and mono
typefaces, scanlines, and film grain.

### Privacy

All persistence is localStorage, namespaced under one prefix. The settings menu
shows a rough byte count and a "forget me" control that wipes everything STATIC
stored on the device.

## Develop

```bash
npm install
npm run dev
```

Open the printed localhost URL. localhost counts as a secure context, so the
camera works without HTTPS. Open a second tab on the same frequency to pair with
yourself.

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serve the production build locally
```

## Deploy to DigitalOcean App Platform

The app is a static bundle. Deploy it as an App Platform static site.

```bash
doctl apps create --spec .do/app.yaml
```

Then add the `static.gdn` domain under the app's Settings, Domains in the
DigitalOcean dashboard (or uncomment the domains block in `.do/app.yaml`). Point
the domain's nameservers or records at DigitalOcean and it issues TLS
automatically. The default relay is the public `wss://relay.clasp.to`, so there
are no secrets to configure.

A `Dockerfile` and `nginx.conf` are also included if you would rather run the
same bundle as a container.
