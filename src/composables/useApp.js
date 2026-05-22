import { ref } from 'vue'
import { useClasp } from './useClasp.js'
import { useProfile } from './useProfile.js'
import { useScreen } from './useScreen.js'
import { useLobby } from './useLobby.js'
import { useCall } from './useCall.js'
import { useMedia } from './useMedia.js'
import { useTheme } from './useTheme.js'
import { rid } from '../lib/id.js'

// Orchestrator. Owns the connect flow and the age gate, and is the one place
// that wires the lobby and call layers together so neither has to know about
// the other. Components talk to the specific composable they need; this keeps
// the cross-cutting transitions in a single readable spot.

const clasp = useClasp()
const profile = useProfile()
const screen = useScreen()
const lobby = useLobby()
const call = useCall()
const media = useMedia()
const theme = useTheme()

const isAdult = ref(false)
const connState = ref('idle') // 'idle' | 'connecting' | 'ok' | 'fail'
let wired = false

function init() {
  theme.apply()
  if (wired) return
  wired = true

  // Lobby asks to enter a room (auto match or manual ring). Tear the lobby down
  // and hand off to the call layer, remembering whether to resume scanning after.
  lobby.setEnterRoomHandler(async (roomId, meta = {}) => {
    const resume = lobby.scanning.value
    lobby.stopAuto()
    lobby.leaveLobby()
    await call.enterRoom(roomId, { resume, ringing: meta.ringing })
  })

  // Call ended. Return to the lobby and decide whether to keep scanning.
  call.setReturnHandler((intent) => {
    const resume = screen.resumeAuto.value
    const wasBrowse = lobby.mode.value === 'browse'
    screen.go('lobby')
    lobby.joinFrequency(screen.freq.value)
    if (intent === 'next' && !wasBrowse) lobby.startAuto()
    else if (intent === 'ended' && resume) lobby.startAuto()
  })

  call.setBlockHandler((sids) => sids.forEach((s) => lobby.block(s)))
  call.setMarkLeftHandler((sid) => lobby.markRecentlyLeft(sid))

  window.addEventListener('beforeunload', () => {
    try {
      call.leaveRoom(false)
    } catch {
      // ignore
    }
    try {
      lobby.leaveLobby()
    } catch {
      // ignore
    }
    try {
      media.release()
    } catch {
      // ignore
    }
    try {
      clasp.close()
    } catch {
      // ignore
    }
  })
}

async function goOnAir(freqInput) {
  if (!isAdult.value) return { ok: false, reason: 'age' }
  if (!profile.profile.handle) profile.profile.handle = 'anon-' + rid(4)

  profile.prefs.lastFreq = freqInput || profile.prefs.lastFreq || 'commons'
  screen.go('lobby')
  connState.value = 'connecting'

  const ok = await clasp.connect(profile.prefs.relay)
  if (ok) {
    lobby.joinFrequency(profile.prefs.lastFreq)
    connState.value = 'ok'
    return { ok: true }
  }
  connState.value = 'fail'
  return { ok: false, reason: 'relay' }
}

async function retryConnect() {
  connState.value = 'connecting'
  const ok = await clasp.connect(profile.prefs.relay)
  if (ok) {
    lobby.joinFrequency(screen.freq.value)
    connState.value = 'ok'
  } else {
    connState.value = 'fail'
  }
  return ok
}

function backToSetup() {
  lobby.leaveLobby()
  media.release()
  screen.go('setup')
}

export function useApp() {
  return {
    isAdult,
    connState,
    init,
    goOnAir,
    retryConnect,
    backToSetup,
  }
}
