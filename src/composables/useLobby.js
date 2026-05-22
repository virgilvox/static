import { reactive, ref, computed } from 'vue'
import { useClasp } from './useClasp.js'
import { useProfile } from './useProfile.js'
import { useScreen } from './useScreen.js'
import { ns, PAIRING_MODES } from '../lib/constants.js'
import { buildCard, accepts, score } from '../lib/match.js'
import { load, save, KEYS } from '../lib/storage.js'

// The lobby: who is waiting on this frequency, and how we pair with them.
// Presence and cards travel over CLASP state (delivered to late joiners). Pings
// keep the roster fresh; stale entries are pruned. The pairing engine runs the
// same pure scoring on both sides so two browsers independently agree on a match
// without a server deciding for them.

const clasp = useClasp()
const { profile, reveal } = useProfile()
const screen = useScreen()

const pool = reactive(new Map()) // sid -> card
const mode = ref('roulette')
const filter = reactive({ axes: new Set(), needTag: false })
const scanning = ref(false)
const pendingInvite = ref(null)

// Blocked is persisted across sessions; recentlyLeft is a short session cooldown.
const blocked = reactive(new Set(load(KEYS.blocked, [])))
const recentlyLeft = new Set()

let unsubs = []
let heartbeat = null
let pruneTimer = null
let autoTimer = null

// Wired by the orchestrator so the lobby never imports the call layer directly.
let enterRoomHandler = () => {}
function setEnterRoomHandler(fn) {
  enterRoomHandler = fn
}

const poolList = computed(() => [...pool.values()].filter((c) => c.sid && !blocked.has(c.sid)))
const poolCount = computed(() => poolList.value.length)
const modeHint = computed(() => PAIRING_MODES.find((m) => m.id === mode.value)?.hint || '')

function myCard() {
  return buildCard({
    profile,
    reveal,
    sid: clasp.sessionId.value,
    mode: mode.value,
    filter,
  })
}

function republishCard() {
  if (!clasp.connected.value || !clasp.sessionId.value) return
  const sid = clasp.sessionId.value
  clasp.set(ns(screen.freq.value, 'lobby', sid, 'card'), myCard())
  clasp.set(ns(screen.freq.value, 'lobby', sid, 'ping'), Date.now())
}

function sidBeforeTail(addr) {
  // address ends in .../<sid>/<key>; the sid is the second to last segment.
  const parts = addr.split('/')
  return parts[parts.length - 2]
}

function joinFrequency(name) {
  teardown()
  screen.tune(name)
  const freq = screen.freq.value
  const me = clasp.sessionId.value

  // Subscribe before publishing so the snapshot of waiting cards lands here.
  unsubs.push(
    clasp.on(ns(freq, 'lobby', '*', 'card'), (card, addr) => {
      const sid = card?.sid || sidBeforeTail(addr)
      if (!sid || sid === me) return
      if (card === null) {
        pool.delete(sid)
      } else {
        // Seed a freshness stamp so a card whose ping snapshot we missed can
        // still be pruned. Live peers refresh this every few seconds.
        if (!card._ping) card._ping = card.ts || Date.now()
        pool.set(sid, card)
      }
    })
  )
  unsubs.push(
    clasp.on(ns(freq, 'invite', me), (inv) => {
      if (inv && inv.from && inv.from !== me) handleInvite(inv)
    })
  )
  unsubs.push(
    clasp.on(ns(freq, 'lobby', '*', 'ping'), (t, addr) => {
      const sid = sidBeforeTail(addr)
      if (!sid || sid === me) return
      const card = pool.get(sid)
      if (card) card._ping = t
    })
  )

  heartbeat = setInterval(() => {
    if (clasp.connected.value) clasp.set(ns(freq, 'lobby', me, 'ping'), Date.now())
  }, 5000)

  pruneTimer = setInterval(() => {
    const now = Date.now()
    for (const [sid, c] of pool) {
      if (c._ping && now - c._ping > 16000) pool.delete(sid)
    }
  }, 4000)

  republishCard()
}

function setMode(next) {
  mode.value = next
  republishCard()
}

function toggleFilterAxis(axis) {
  if (filter.axes.has(axis)) filter.axes.delete(axis)
  else filter.axes.add(axis)
  republishCard()
}

function toggleNeedTag() {
  filter.needTag = !filter.needTag
  republishCard()
}

// ---- auto pairing ----
function startAuto() {
  scanning.value = true
  clearInterval(autoTimer)
  const tick = () => {
    if (screen.screen.value === 'call') return
    if (!clasp.sessionId.value) return
    const mine = myCard()
    const cands = poolList.value.filter(
      (c) =>
        c.mode !== 'browse' && // browse users pick manually, do not yank them in
        !recentlyLeft.has(c.sid) &&
        accepts(mine, c) &&
        accepts(c, mine)
    )
    if (!cands.length) return
    cands.sort((a, b) => score(mine, b) - score(mine, a))
    const best = cands[0]
    // Deterministic initiator: the lexicographically lower sid sends the invite.
    if (mine.sid.localeCompare(best.sid) < 0) {
      const roomId = mine.sid.slice(0, 6) + '-' + best.sid.slice(0, 6)
      ringPeer(best.sid, roomId, true)
    }
    // Higher sid waits for the invite to arrive in handleInvite.
  }
  autoTimer = setInterval(tick, 1500)
  tick()
}

function stopAuto() {
  clearInterval(autoTimer)
  autoTimer = null
  scanning.value = false
}

function ringPeer(targetSid, roomId, auto = false) {
  if (!clasp.sessionId.value) return
  const room = roomId || clasp.sessionId.value.slice(0, 6) + '-' + targetSid.slice(0, 6)
  clasp.emit(ns(screen.freq.value, 'invite', targetSid), {
    from: clasp.sessionId.value,
    roomId: room,
    mode: mode.value,
    card: myCard(),
    auto,
  })
  enterRoomHandler(room)
}

function handleInvite(inv) {
  if (screen.screen.value === 'call') return
  if (blocked.has(inv.from)) return
  if (inv.auto) {
    enterRoomHandler(inv.roomId)
    return
  }
  pendingInvite.value = {
    ...inv,
    handle: inv.card?.display?.handle || 'someone',
  }
}

function acceptInvite() {
  const inv = pendingInvite.value
  pendingInvite.value = null
  if (inv) enterRoomHandler(inv.roomId)
}

function declineInvite() {
  const inv = pendingInvite.value
  pendingInvite.value = null
  if (inv) {
    recentlyLeft.add(inv.from)
    try {
      clasp.emit(ns(screen.freq.value, 'room', inv.roomId, 'signal', inv.from), {
        from: clasp.sessionId.value,
        type: 'decline',
      })
    } catch {
      // ignore
    }
  }
}

// ---- block list ----
function block(sid) {
  if (!sid) return
  blocked.add(sid)
  recentlyLeft.add(sid)
  save(KEYS.blocked, [...blocked])
  pool.delete(sid)
}

function unblock(sid) {
  blocked.delete(sid)
  save(KEYS.blocked, [...blocked])
}

function markRecentlyLeft(sid) {
  if (sid) recentlyLeft.add(sid)
}

function teardown() {
  unsubs.forEach((fn) => {
    try {
      fn()
    } catch {
      // ignore
    }
  })
  unsubs = []
  clearInterval(heartbeat)
  clearInterval(pruneTimer)
  clearInterval(autoTimer)
  heartbeat = pruneTimer = autoTimer = null
  scanning.value = false
  pool.clear()
}

function leaveLobby() {
  const me = clasp.sessionId.value
  if (clasp.connected.value && me) {
    clasp.set(ns(screen.freq.value, 'lobby', me, 'card'), null)
    clasp.set(ns(screen.freq.value, 'lobby', me, 'ping'), null)
  }
  teardown()
}

export function useLobby() {
  return {
    pool,
    poolList,
    poolCount,
    mode,
    filter,
    modeHint,
    scanning,
    pendingInvite,
    blocked,
    modes: PAIRING_MODES,
    myCard,
    joinFrequency,
    leaveLobby,
    republishCard,
    setMode,
    toggleFilterAxis,
    toggleNeedTag,
    startAuto,
    stopAuto,
    ringPeer,
    acceptInvite,
    declineInvite,
    block,
    unblock,
    markRecentlyLeft,
    setEnterRoomHandler,
  }
}
