import { ref } from 'vue'
import { useClasp } from './useClasp.js'
import { useProfile } from './useProfile.js'
import { useScreen } from './useScreen.js'
import { useMedia } from './useMedia.js'
import { ns, ICE_SERVERS, REACTIONS } from '../lib/constants.js'

// Reaction ids we will render. Anything else from a peer is ignored.
const VALID_REACTIONS = new Set(REACTIONS.map((r) => r.id))

// The call: direct WebRTC between two browsers. CLASP carries only the handshake
// (presence, SDP offer/answer, ICE candidates, and the recording-consent flag).
// Camera, mic, text chat, and reactions all travel peer to peer and never touch
// the relay. The camera and mic stream itself is owned by useMedia so a lobby
// preview carries straight into the call.

const clasp = useClasp()
const { profile } = useProfile()
const screen = useScreen()
const media = useMedia()

const room = ref(null)
const peerStatus = ref('connecting')
const remoteTiles = ref([]) // { peerId, handle, stream }

const messages = ref([]) // { from: 'me' | 'peer', handle, text, ts }
const reactions = ref([]) // transient { key, id, peerId }
const quality = ref('') // '', 'good', 'ok', 'poor'

const recording = ref(false)
const remoteRecording = ref(false)

// Wired by the orchestrator.
let returnToLobby = () => {}
let blockPeers = () => {}
function setReturnHandler(fn) {
  returnToLobby = fn
}
function setBlockHandler(fn) {
  blockPeers = fn
}

const peers = new Map() // peerId -> { connection, iceQueue, info, channel }
let roomUnsubs = []
let waitTimer = null
let statsTimer = null

// A device switch in the lobby preview or mid-call swaps the live tracks on any
// open peer connection without renegotiating.
media.setReplaceHandler((newStream) => {
  for (const { connection } of peers.values()) {
    if (!connection) continue
    const senders = connection.getSenders()
    newStream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track && s.track.kind === track.kind)
      if (sender) sender.replaceTrack(track).catch(() => {})
    })
  }
})

// Recording internals.
let recorder = null
let recChunks = []
let recRAF = null
let recAudioCtx = null
let recVideos = []

function selfId() {
  return clasp.sessionId.value
}

async function enterRoom(roomId, { resume = false, ringing = null } = {}) {
  if (room.value) return
  screen.resumeAuto.value = resume
  room.value = roomId
  screen.go('call')
  messages.value = []
  reactions.value = []
  quality.value = ''
  remoteRecording.value = false

  await media.ensureStream()

  const freq = screen.freq.value
  const me = selfId()

  roomUnsubs.push(
    clasp.on(ns(freq, 'room', roomId, 'presence', '*'), (data, addr) => {
      const peerId = addr.split('/').pop()
      if (peerId === me) return
      if (data === null) handlePeerLeft(peerId)
      else handlePeerJoined(peerId, data)
    })
  )
  roomUnsubs.push(
    clasp.on(ns(freq, 'room', roomId, 'signal', me), (data) => {
      if (data && data.from && data.from !== me) handleSignal(data)
    })
  )
  roomUnsubs.push(
    clasp.on(ns(freq, 'room', roomId, 'rec'), (data) => {
      const on = !!(data && data.on)
      remoteRecording.value = on && data.by !== me
    })
  )

  clasp.set(ns(freq, 'room', roomId, 'presence', me), {
    handle: profile.handle,
    joinedAt: Date.now(),
  })

  peerStatus.value = ringing ? 'ringing ' + ringing : 'waiting for peer'
  clearTimeout(waitTimer)
  waitTimer = setTimeout(() => {
    if (room.value === roomId && peers.size === 0) {
      peerStatus.value = 'no answer'
      endCall('ended')
    }
  }, 28000)

  startStatsPoll()
}

// ---- presence and peer connections ----
function handlePeerJoined(peerId, data) {
  clearTimeout(waitTimer)
  waitTimer = null
  peerStatus.value = 'connected'

  // Record the handle from presence whether or not the connection exists yet,
  // so the tile label is correct regardless of presence/offer arrival order.
  const entry = peers.get(peerId) || { iceQueue: [] }
  if (data?.handle) {
    entry.info = { ...(entry.info || {}), handle: data.handle }
    peers.set(peerId, entry)
    const tile = remoteTiles.value.find((t) => t.peerId === peerId)
    if (tile) tile.handle = data.handle
  }

  // The lexicographically larger sid creates the offer and the data channel.
  if (!entry.connection && selfId().localeCompare(peerId) > 0) {
    createPeerConnection(peerId, true, data)
  }
}

function handlePeerLeft(peerId) {
  closePeer(peerId)
  peers.delete(peerId)
  remoteTiles.value = remoteTiles.value.filter((t) => t.peerId !== peerId)
  // Only end the call if we are still in one. A connection state change can
  // fire after leaveRoom has already torn everything down.
  if (peers.size === 0 && room.value) {
    peerStatus.value = 'peer hung up'
    endCall('ended')
  }
}

function createPeerConnection(peerId, initiator, info) {
  if (peers.has(peerId) && peers.get(peerId).connection) {
    return peers.get(peerId).connection
  }
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const entry = peers.get(peerId) || { iceQueue: [] }
  entry.connection = connection
  entry.info = info || entry.info
  peers.set(peerId, entry)

  if (media.stream.value) {
    media.stream.value.getTracks().forEach((t) => connection.addTrack(t, media.stream.value))
  }

  if (initiator) {
    const channel = connection.createDataChannel('static')
    setupChannel(peerId, channel)
  } else {
    connection.ondatachannel = (ev) => setupChannel(peerId, ev.channel)
  }

  connection.ontrack = (ev) => {
    const [remote] = ev.streams
    const handle = (entry.info && entry.info.handle) || 'peer-' + peerId.slice(0, 4)
    const existing = remoteTiles.value.find((t) => t.peerId === peerId)
    if (existing) existing.stream = remote
    else remoteTiles.value = [...remoteTiles.value, { peerId, handle, stream: remote }]
  }

  connection.onicecandidate = (ev) => {
    if (ev.candidate) {
      sendSignal(peerId, {
        type: 'ice-candidate',
        candidate: {
          candidate: ev.candidate.candidate,
          sdpMid: ev.candidate.sdpMid,
          sdpMLineIndex: ev.candidate.sdpMLineIndex,
        },
      })
    }
  }

  connection.onconnectionstatechange = () => {
    const st = connection.connectionState
    if (st === 'connected') peerStatus.value = 'connected'
    if (st === 'failed' || st === 'closed') handlePeerLeft(peerId)
  }

  if (initiator) {
    connection
      .createOffer()
      .then((offer) => connection.setLocalDescription(offer))
      .then(() =>
        sendSignal(peerId, {
          type: 'offer',
          sdp: { type: connection.localDescription.type, sdp: connection.localDescription.sdp },
        })
      )
      .catch(() => {})
  }

  return connection
}

function setupChannel(peerId, channel) {
  const entry = peers.get(peerId)
  if (entry) entry.channel = channel
  channel.onmessage = (ev) => {
    let msg
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    const handle = entry?.info?.handle || 'peer'
    if (msg.kind === 'chat' && typeof msg.text === 'string') {
      messages.value = [...messages.value, { from: 'peer', handle, text: msg.text.slice(0, 500), ts: Date.now() }]
    } else if (msg.kind === 'reaction' && VALID_REACTIONS.has(msg.id)) {
      pushReaction(msg.id, peerId)
    }
  }
}

function broadcast(payload) {
  const str = JSON.stringify(payload)
  for (const { channel } of peers.values()) {
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(str)
      } catch {
        // ignore
      }
    }
  }
}

function sendChat(text) {
  const clean = (text || '').trim().slice(0, 500)
  if (!clean) return
  broadcast({ kind: 'chat', text: clean })
  messages.value = [...messages.value, { from: 'me', handle: profile.handle || 'you', text: clean, ts: Date.now() }]
}

function sendReaction(id) {
  broadcast({ kind: 'reaction', id })
  pushReaction(id, 'me')
}

function pushReaction(id, peerId) {
  const key = Math.random().toString(36).slice(2)
  reactions.value = [...reactions.value, { id, key, peerId }]
  setTimeout(() => {
    reactions.value = reactions.value.filter((r) => r.key !== key)
  }, 2600)
}

function sendSignal(peerId, data) {
  clasp.emit(ns(screen.freq.value, 'room', room.value, 'signal', peerId), {
    from: selfId(),
    ...data,
  })
}

async function handleSignal(data) {
  const { from, type } = data
  if (type === 'decline') {
    endCall('ended')
    return
  }
  if (type === 'offer') {
    const conn = createPeerConnection(from, false, peers.get(from)?.info)
    try {
      await conn.setRemoteDescription(new RTCSessionDescription(data.sdp))
      await drainIce(from)
      const ans = await conn.createAnswer()
      await conn.setLocalDescription(ans)
      sendSignal(from, { type: 'answer', sdp: { type: conn.localDescription.type, sdp: conn.localDescription.sdp } })
    } catch {
      // ignore
    }
  } else if (type === 'answer') {
    const p = peers.get(from)
    if (p?.connection) {
      try {
        await p.connection.setRemoteDescription(new RTCSessionDescription(data.sdp))
        await drainIce(from)
      } catch {
        // ignore
      }
    }
  } else if (type === 'ice-candidate') {
    const p = peers.get(from)
    const cand = new RTCIceCandidate(data.candidate)
    if (p?.connection && p.connection.remoteDescription) {
      try {
        await p.connection.addIceCandidate(cand)
      } catch {
        // ignore
      }
    } else {
      if (!peers.has(from)) peers.set(from, { connection: null, iceQueue: [] })
      peers.get(from).iceQueue.push(cand)
    }
  }
}

async function drainIce(peerId) {
  const p = peers.get(peerId)
  if (!p) return
  for (const c of p.iceQueue) {
    try {
      await p.connection.addIceCandidate(c)
    } catch {
      // ignore
    }
  }
  p.iceQueue.length = 0
}

function closePeer(peerId) {
  const p = peers.get(peerId)
  if (p?.connection && p.connection.connectionState !== 'closed') {
    try {
      p.connection.close()
    } catch {
      // ignore
    }
  }
}

// ---- connection quality ----
function startStatsPoll() {
  clearInterval(statsTimer)
  statsTimer = setInterval(async () => {
    const p = [...peers.values()][0]
    if (!p?.connection || p.connection.connectionState !== 'connected') {
      quality.value = ''
      return
    }
    try {
      const stats = await p.connection.getStats()
      let rtt = 0
      let loss = 0
      stats.forEach((r) => {
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.currentRoundTripTime != null) {
          rtt = r.currentRoundTripTime
        }
        if (r.type === 'inbound-rtp' && r.kind === 'video' && r.packetsLost != null && r.packetsReceived) {
          loss = r.packetsLost / (r.packetsLost + r.packetsReceived)
        }
      })
      if (rtt > 0.4 || loss > 0.08) quality.value = 'poor'
      else if (rtt > 0.2 || loss > 0.03) quality.value = 'ok'
      else quality.value = 'good'
    } catch {
      quality.value = ''
    }
  }, 3000)
}

// ---- controls (mic and cam toggles live in useMedia) ----
function next() {
  leaveRoom(true)
  returnToLobby('next')
}

function hangup() {
  leaveRoom(false)
  returnToLobby('hangup')
}

function blockReport() {
  blockPeers([...peers.keys()])
  leaveRoom(true)
  returnToLobby('block')
}

function endCall(intent) {
  leaveRoom(intent === 'next' || intent === 'block')
  returnToLobby(intent)
}

function leaveRoom(blacklist) {
  const current = room.value
  if (!current) return
  clearTimeout(waitTimer)
  waitTimer = null
  clearInterval(statsTimer)
  statsTimer = null

  if (clasp.connected.value) {
    clasp.set(ns(screen.freq.value, 'room', current, 'presence', selfId()), null)
  }

  for (const [pid] of peers) {
    if (blacklist) markPeerLeft(pid)
    closePeer(pid)
  }
  peers.clear()
  remoteTiles.value = []
  roomUnsubs.forEach((fn) => {
    try {
      fn()
    } catch {
      // ignore
    }
  })
  roomUnsubs = []

  stopRecording(true)

  // The camera and mic stream is owned by useMedia and intentionally kept alive
  // across calls so roulette spins do not blink the camera and the lobby preview
  // stays warm. It is released when returning to setup or on unload.
  quality.value = ''
  room.value = null
}

// markPeerLeft is wired to the lobby cooldown via the block handler path; here we
// only need to ask the lobby to remember it briefly. The orchestrator passes a
// no-arg blockPeers for hard blocks, so cooldown is handled there for "next".
let markPeerLeft = () => {}
function setMarkLeftHandler(fn) {
  markPeerLeft = fn
}

// ---- recording (consent gated, composites everyone, notifies all parties) ----
function toggleRecording() {
  if (recording.value) stopRecording(false)
  else startRecording()
}

function startRecording() {
  if (recorder) return
  try {
    const cv = document.createElement('canvas')
    cv.width = 640
    cv.height = 480
    const ctx = cv.getContext('2d')

    const streams = [media.stream.value, ...remoteTiles.value.map((t) => t.stream)].filter(Boolean)
    recVideos = streams.map((stream) => {
      const v = document.createElement('video')
      v.muted = true
      v.autoplay = true
      v.playsInline = true
      v.srcObject = stream
      v.play?.().catch(() => {})
      return v
    })

    const draw = () => {
      const vids = recVideos.filter((v) => v.videoWidth)
      const n = Math.max(1, vids.length)
      const cols = Math.ceil(Math.sqrt(n))
      const rows = Math.ceil(n / cols)
      const cw = cv.width / cols
      const ch = cv.height / rows
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, cv.width, cv.height)
      vids.forEach((v, i) => {
        const x = (i % cols) * cw
        const y = Math.floor(i / cols) * ch
        try {
          ctx.drawImage(v, x, y, cw, ch)
        } catch {
          // a frame may not be ready yet
        }
      })
      recRAF = requestAnimationFrame(draw)
    }
    draw()

    const ac = new (window.AudioContext || window.webkitAudioContext)()
    recAudioCtx = ac
    const dst = ac.createMediaStreamDestination()
    streams.forEach((st) => {
      if (st.getAudioTracks().length) {
        try {
          ac.createMediaStreamSource(st).connect(dst)
        } catch {
          // ignore
        }
      }
    })

    const mixed = new MediaStream([cv.captureStream(24).getVideoTracks()[0], ...dst.stream.getAudioTracks()])
    recorder = new MediaRecorder(mixed, { mimeType: pickMime() })
    recChunks = []
    recorder.ondataavailable = (e) => {
      if (e.data.size) recChunks.push(e.data)
    }
    recorder.onstop = saveRecording
    recorder.start(1000)

    clasp.set(ns(screen.freq.value, 'room', room.value, 'rec'), { on: true, by: selfId() })
    recording.value = true
  } catch {
    recording.value = false
  }
}

function pickMime() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || 'video/webm'
}

function stopRecording(silent) {
  if (!recorder) return
  try {
    recorder.stop()
  } catch {
    // ignore
  }
  recorder = null
  if (recRAF) cancelAnimationFrame(recRAF)
  recRAF = null
  if (recAudioCtx) {
    try {
      recAudioCtx.close()
    } catch {
      // ignore
    }
    recAudioCtx = null
  }
  recVideos.forEach((v) => {
    v.srcObject = null
  })
  recVideos = []
  if (clasp.connected.value && room.value) {
    clasp.set(ns(screen.freq.value, 'room', room.value, 'rec'), { on: false, by: selfId() })
  }
  recording.value = false
}

function saveRecording() {
  if (!recChunks.length) return
  const blob = new Blob(recChunks, { type: 'video/webm' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'static-' + Date.now() + '.webm'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function useCall() {
  return {
    room,
    peerStatus,
    remoteTiles,
    messages,
    reactions,
    quality,
    recording,
    remoteRecording,
    enterRoom,
    leaveRoom,
    next,
    hangup,
    blockReport,
    toggleRecording,
    sendChat,
    sendReaction,
    setReturnHandler,
    setBlockHandler,
    setMarkLeftHandler,
  }
}
