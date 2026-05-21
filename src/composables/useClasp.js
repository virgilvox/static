import { ref, shallowRef, readonly } from 'vue'
import { ClaspBuilder } from '@clasp-to/core'
import { DEFAULT_RELAY_URL } from '../lib/constants.js'
import { rid, withTimeout } from '../lib/id.js'

// Connection to the CLASP relay. This is the signaling plane: presence, lobby
// cards, invites, and WebRTC handshake messages travel here. Camera and mic
// never do. Shared singleton state so every composable talks to one client.

const client = shallowRef(null)
const connected = ref(false)
const sessionId = ref(null)
const statusText = ref('idle')
const libraryReady = ref(true)

async function connect(url) {
  const target = (url || DEFAULT_RELAY_URL).toString().trim()

  if (typeof ClaspBuilder !== 'function') {
    libraryReady.value = false
    statusText.value = 'library blocked'
    return false
  }

  try {
    statusText.value = 'dialing relay'
    if (client.value) {
      try {
        client.value.close()
      } catch {
        // ignore
      }
      client.value = null
    }

    const c = await withTimeout(
      new ClaspBuilder(target)
        .name('static-app')
        .features(['param', 'event', 'stream'])
        .reconnect(true)
        .connect(),
      9000,
      'relay connect'
    )

    client.value = c
    sessionId.value = c.session || 'sid-' + rid(10)
    connected.value = true
    statusText.value = 'on-air'

    c.onDisconnect?.(() => {
      connected.value = false
      statusText.value = 'reconnecting'
    })
    c.onReconnect?.(() => {
      connected.value = true
      statusText.value = 'on-air'
    })
    c.onConnect?.(() => {
      connected.value = true
      statusText.value = 'on-air'
    })

    return true
  } catch (e) {
    connected.value = false
    statusText.value = 'relay unreachable'
    return false
  }
}

function on(pattern, cb) {
  if (!client.value) return () => {}
  return client.value.on(pattern, cb)
}

function set(address, value) {
  client.value?.set(address, value)
}

function emit(address, payload) {
  client.value?.emit(address, payload)
}

function close() {
  try {
    client.value?.close()
  } catch {
    // ignore
  }
  client.value = null
  connected.value = false
  sessionId.value = null
}

export function useClasp() {
  return {
    client: readonly(client),
    connected: readonly(connected),
    sessionId: readonly(sessionId),
    statusText: readonly(statusText),
    libraryReady: readonly(libraryReady),
    connect,
    on,
    set,
    emit,
    close,
  }
}
