import { ref, reactive, shallowRef } from 'vue'
import { useClasp } from './useClasp.js'
import { useProfile } from './useProfile.js'
import { useScreen } from './useScreen.js'
import { ns, ICE_SERVERS } from '../lib/constants.js'

// The call: direct WebRTC between two browsers. CLASP carries only the handshake
// (presence, SDP offer/answer, ICE candidates, and the recording-consent flag).
// Camera, mic, text chat, and reactions all travel peer to peer and never touch
// the relay.

const clasp = useClasp()
const { profile } = useProfile()
const screen = useScreen()

const room = ref(null)
const peerStatus = ref('connecting')
const localStream = shallowRef(null)
const remoteTiles = ref([]) // { peerId, handle, stream }
const audioOn = ref(true)
const camOn = ref(true)
const usingGhost = ref(false)
const camNotice = ref('')

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
let staticRAF = null
let statsTimer = null

// Recording internals.
let recorder = null
let recChunks = []
let recRAF = null
let recAudioCtx = null
let recVideos = []

function selfId() {
  return clasp.sessionId.value
}

async function enterRoom(roomId, { resume = false } = {}) {
  if (room.value) return
  screen.resumeAuto.value = resume
  room.value = roomId
  screen.go('call')
  messages.value = []
  reactions.value = []
  quality.value = ''
  remoteRecording.value = false

  await startMedia()

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

  peerStatus.value = 'waiting for peer'
  clearTimeout(waitTimer)
  waitTimer = setTimeout(() => {
    if (room.value === roomId && peers.size === 0) {
      endCall('ended')
    }
  }, 28000)

  startStatsPoll()
}

// ---- media ----
async function startMedia() {
  usingGhost.value = false
  camNotice.value = ''
  const secure = window.isSecureContext

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    localStream.value = makeGhostStream(profile.handle || 'NO SIGNAL')
    usingGhost.value = true
    camNotice.value = secure
      ? 'Camera unavailable. Connecting with a placeholder static stream.'
      : 'No camera in an insecure context. Serve over http://localhost for camera access. Connecting with a placeholder static stream.'
    return
  }

  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      audio: true,
    })
  } catch (e) {
    localStream.value = makeGhostStream(profile.handle || 'NO SIGNAL')
    usingGhost.value = true
    camNotice.value = 'Camera or mic blocked (' + e.name + '). Connecting with a placeholder static stream.'
  }
}

// A canvas "dead channel" stream so the pipeline still works with no camera.
function makeGhostStream(label) {
  const cv = document.createElement('canvas')
  cv.width = 320
  cv.height = 240
  const ctx = cv.getContext('2d')
  const draw = () => {
    const img = ctx.createImageData(cv.width, cv.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    ctx.fillStyle = 'rgba(0,0,0,.55)'
    ctx.fillRect(0, cv.height / 2 - 22, cv.width, 44)
    ctx.fillStyle = '#9dff00'
    ctx.font = '20px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(label.toUpperCase().slice(0, 16), cv.width / 2, cv.height / 2 + 7)
    staticRAF = requestAnimationFrame(draw)
  }
  draw()
  const stream = cv.captureStream(12)
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    const dst = ac.createMediaStreamDestination()
    const osc = ac.createOscillator()
    const g = ac.createGain()
    g.gain.value = 0
    osc.connect(g)
    g.connect(dst)
    osc.start()
    stream.addTrack(dst.stream.getAudioTracks()[0])
  } catch {
    // no audio track is acceptable
  }
  return stream
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

  if (localStream.value) {
    localStream.value.getTracks().forEach((t) => connection.addTrack(t, localStream.value))
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
    } else if (msg.kind === 'reaction' && msg.id) {
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

// ---- controls ----
function toggleMic() {
  const t = localStream.value?.getAudioTracks()[0]
  if (!t) return
  t.enabled = !t.enabled
  audioOn.value = t.enabled
}

function toggleCam() {
  const t = localStream.value?.getVideoTracks()[0]
  if (!t) return
  t.enabled = !t.enabled
  camOn.value = t.enabled
}

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

  if (staticRAF) cancelAnimationFrame(staticRAF)
  staticRAF = null
  if (localStream.value) {
    localStream.value.getTracks().forEach((t) => t.stop())
    localStream.value = null
  }
  audioOn.value = true
  camOn.value = true
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

    const streams = [localStream.value, ...remoteTiles.value.map((t) => t.stream)].filter(Boolean)
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
    localStream,
    remoteTiles,
    audioOn,
    camOn,
    usingGhost,
    camNotice,
    messages,
    reactions,
    quality,
    recording,
    remoteRecording,
    enterRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
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
