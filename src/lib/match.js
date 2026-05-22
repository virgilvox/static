// Pure matching logic. Operates on "match vectors" (bucketed profile values).
// No DOM, no network, no Vue. This is what makes pairing symmetric and testable:
// both peers run the same functions on the same published cards.

import { POL_SCALE } from './constants.js'

// Distance 0..1 between two match vectors, averaged across axes present on both.
export function distance(a, b) {
  const parts = []

  // Political lean is ordinal, so distance is graded rather than binary.
  if (a.politics != null && b.politics != null && POL_SCALE[a.politics] != null && POL_SCALE[b.politics] != null) {
    parts.push(Math.abs(POL_SCALE[a.politics] - POL_SCALE[b.politics]) / 6)
  }

  // Categorical axes: same or different.
  ;['religion', 'gender', 'orientation', 'language', 'country', 'state'].forEach((k) => {
    if (a[k] != null && b[k] != null) parts.push(a[k] === b[k] ? 0 : 1)
  })

  // Tags and fandoms: 1 minus Jaccard overlap.
  const setA = new Set([...(a.tags || []), ...(a.fandoms || [])])
  const setB = new Set([...(b.tags || []), ...(b.fandoms || [])])
  if (setA.size || setB.size) {
    const inter = [...setA].filter((x) => setB.has(x)).length
    const uni = new Set([...setA, ...setB]).size || 1
    parts.push(1 - inter / uni)
  }

  if (!parts.length) return 0.5 // nothing comparable, treat as neutral
  return parts.reduce((s, x) => s + x, 0) / parts.length
}

// Operates on match vectors (the .v of a card), which carry tags and fandoms.
export function sharesTag(a, b) {
  const setA = new Set([...(a.tags || []), ...(a.fandoms || [])])
  return [...(b.tags || []), ...(b.fandoms || [])].some((x) => setA.has(x))
}

// Does viewer accept candidate under viewer's own mode and filter rules?
export function accepts(viewer, cand) {
  if (viewer.mode === 'roulette' || viewer.mode === 'browse') return true
  if (viewer.mode === 'filter') {
    for (const ax of viewer.filter?.axes || []) {
      if (viewer.v[ax] != null && cand.v[ax] != null && viewer.v[ax] !== cand.v[ax]) return false
    }
    if (viewer.filter?.needTag && !sharesTag(viewer.v, cand.v)) return false
    return true
  }
  if (viewer.mode === 'complementary') return sharesTag(viewer.v, cand.v)
  return true // similar and opposite accept anyone, they only rank
}

// Preference score for a candidate (higher is better) under my mode.
export function score(mine, cand) {
  const d = distance(mine.v, cand.v)
  switch (mine.mode) {
    case 'similar':
      return 1 - d
    case 'opposite':
      return d
    case 'complementary': {
      const tagBoost = sharesTag(mine.v, cand.v) ? 0.5 : 0
      let pol = 0.5
      if (
        mine.v.politics != null &&
        cand.v.politics != null &&
        POL_SCALE[mine.v.politics] != null &&
        POL_SCALE[cand.v.politics] != null
      ) {
        pol = Math.abs(POL_SCALE[mine.v.politics] - POL_SCALE[cand.v.politics]) / 6
      }
      return tagBoost + pol * 0.5
    }
    case 'filter':
      return 1 - d // among the eligible, prefer the nearest
    default:
      return Math.random() // roulette and browse
  }
}

// A friendly 0..100 readout that adapts to the active mode.
export function matchPct(mine, cand) {
  let s
  switch (mine.mode) {
    case 'opposite':
      s = distance(mine.v, cand.v)
      break
    case 'complementary':
      s = score(mine, cand)
      break
    default:
      s = 1 - distance(mine.v, cand.v)
  }
  return Math.round(Math.max(0, Math.min(1, s)) * 100)
}

// Build the public card from a profile, reveal map, session id, mode and filter.
// display holds only revealed fields; v (the match vector) holds bucketed values
// for every set field so hidden axes can still drive pairing without ever being
// shown to the other person.
export function buildCard({ profile, reveal, sid, mode, filter }) {
  const p = profile
  const id = sid || 'pending'
  const display = { handle: p.handle || 'anon-' + id.slice(0, 4) }
  ;['country', 'state', 'language', 'politics', 'gender', 'orientation', 'religion'].forEach((k) => {
    if (reveal[k] && p[k]) display[k] = p[k]
  })
  display.fandoms = (p.fandoms || []).slice(0, 6)
  display.tags = (p.tags || []).slice(0, 6)

  const v = {
    politics: p.politics || null,
    religion: p.religion || null,
    gender: p.gender || null,
    orientation: p.orientation || null,
    language: p.language || null,
    country: p.country ? p.country.toLowerCase() : null,
    state: p.state ? p.state.toLowerCase() : null,
    fandoms: (p.fandoms || []).map((x) => x.toLowerCase()),
    tags: (p.tags || []).map((x) => x.toLowerCase()),
  }

  return {
    sid: id,
    ts: Date.now(),
    mode,
    filter: { axes: [...(filter?.axes || [])], needTag: !!filter?.needTag },
    display,
    v,
  }
}
