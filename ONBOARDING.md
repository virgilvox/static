# STATIC handoff

Random, discoverable WebRTC video chat. No login, no database. Signaling and
presence run over the public CLASP relay; camera, mic, text chat, and reactions
are direct peer to peer.

## Live status

- App: DigitalOcean App Platform static site `static-gdn`
  (id `3a9dfc5f-ee92-4cda-8c64-5a564d340a7c`), in the `lumen` project.
- Working URL now: https://static-gdn-wfriv.ondigitalocean.app
- Repo: https://github.com/virgilvox/static (branch `main`)
- Cost: static site, no running instance, served from CDN.

### One open item (needs registrar access)

`static.gdn` is on DigitalOcean DNS and configured on the app as the primary
domain with an auto cert ready. It will not serve until the domain's
nameservers are changed at the registrar (currently Namecheap,
`dns1/dns2.registrar-servers.com`) to:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

After that propagates, `https://static.gdn` serves the app with TLS, no further
action needed. Alternatively, keep DNS at Namecheap and switch the app to
external DNS mode (add an ALIAS at the apex to the app ingress).

## Run, build, deploy

```bash
npm install
npm run dev        # localhost is a secure context, so the camera works
npm run build      # outputs dist/
```

Deploy is a generic git clone URL source, so it does NOT redeploy on push.
Trigger a rebuild from the latest commit on main:

```bash
doctl apps create-deployment 3a9dfc5f-ee92-4cda-8c64-5a564d340a7c
```

Apply spec changes (domains, build command): `doctl apps update <id> --spec .do/app.yaml`.

## Architecture

Vite + Vue 3 SPA, client only, no backend. Concerns are separated on purpose:

- `src/theme/` design tokens and global base. Switching `data-theme` on `<html>`
  reskins everything (three themes).
- `src/lib/` pure logic, no Vue or DOM: matching, passport, places, storage,
  constants, ids. Testable in plain Node.
- `src/composables/` all reactive state and side effects:
  - `useClasp` relay connection
  - `useProfile` identity, reveal flags, saved passports, prefs (localStorage only)
  - `useMedia` the single owner of the camera and mic stream
  - `useScreen` setup / lobby / call state
  - `useLobby` presence pool, pairing engine, invites
  - `useCall` WebRTC peers, chat, reactions, recording, quality
  - `useApp` orchestrator: the one place that wires lobby and call together
- `src/components/ui/` design system primitives. Feature components in
  `setup/`, `lobby/`, `call/`.

## Conventions (see CLAUDE.md)

- No Claude attribution in commits. No emdashes or double dashes, no emojis.
  Icons come from `lucide-vue-next` only.
- All user data is localStorage, namespaced under one prefix. The settings menu
  has a "forget me" wipe.

## Key behaviors and gotchas

- Pairing is symmetric and serverless: both browsers run the same pure scoring on
  published cards. The lower session id sends the invite; the larger creates the
  WebRTC offer.
- Invites are state with a 30s TTL plus a staleness guard, consumed on receipt.
  This is more reliable than a fire and forget event for a human-paced ring.
- The camera and mic stream is acquired once (lobby preview or call entry) and
  kept alive across roulette spins. Released on returning to setup or unload.
- Room ids are derived from the two session ids and can repeat. A stale
  `presence=null` from a previous occupant is ignored unless we actually had that
  peer, so a fresh call does not end on entry.
- The post-next skip cooldown expires after 8s. It used to be permanent, which
  could deadlock two people. With only two testers, "next" pairs you back after
  the cooldown since there is nobody else.
- Match-only fields are not shown in the peer interface but do travel over the
  public relay to compute the match. Do not treat any field as secret.

## Reasonable next steps

- Finish the `static.gdn` nameserver delegation, then verify end to end.
- Optional: a blocked-list management view, a third-plus-party UI, and
  reconnect-to-last-peer.

Reference: the original single-file prototype is at `reference/static-original.html`.
