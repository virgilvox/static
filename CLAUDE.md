# STATIC project rules

## Commit authorship
Never add Claude as an author, co-author, or contributor in git commits, files,
or any other attribution. Do not use `Co-Authored-By` trailers, "Generated with"
footers, or similar mechanisms. Commits must read as if written entirely by the
human developer.

## Prose and copy
- No emdashes and no double dashes in UI copy, comments, docs, or commit messages.
  Use a period, a comma, or restructure the sentence instead.
- No emojis anywhere, including as icons or status glyphs.
- Avoid the usual machine-written tells: no "delve", no "in today's fast-paced
  world", no "it's worth noting that", no breathless adjective stacks, no
  "seamless / robust / leverage / unlock" filler. Write plainly.

## Icons
- Use the `lucide-vue-next` icon library only. Never use emoji, Font Awesome, or
  inline ad-hoc SVG for iconography.

## Architecture
- Vite + Vue 3 single-page app. Client only. No backend.
- Signaling, presence, and lobby run over the public CLASP relay
  (`wss://relay.clasp.to`). Media is direct WebRTC between browsers.
- Centralized design tokens in `src/theme`. Reusable primitives in
  `src/components/ui`. Domain logic in pure modules under `src/lib` and stateful
  logic in composables under `src/composables`. Keep concerns separated.
- All user data (passport, preferences) lives in localStorage only. A visible
  "forget me" control must always be able to wipe it.

## Deployment
- Target is DigitalOcean App Platform as a static site. Domain: static.gdn.
- The build output is `dist/`. Do not introduce a server runtime.
