import { ref, shallowRef } from 'vue'
import { useProfile } from './useProfile.js'

// Owns the local camera and mic stream for the whole app. The lobby preview and
// the call both read from here, so the stream is acquired once and carried into
// a match with no second permission prompt and no camera light flicker between
// roulette spins. Device choices and mute states persist across calls.

const { prefs } = useProfile()

const stream = shallowRef(null)
const active = ref(false)
const usingGhost = ref(false)
const notice = ref('')
const audioOn = ref(true)
const camOn = ref(true)
const micLevel = ref(0)
const videoInputs = ref([])
const audioInputs = ref([])

let staticRAF = null
let meterCtx = null
let meterSource = null
let meterRAF = null

// useCall registers this so a device switch mid-call swaps the tracks on the
// live peer connection without renegotiating.
let replaceHandler = null
function setReplaceHandler(fn) {
  replaceHandler = fn
}

function constraints() {
  const video = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
  if (prefs.camId) video.deviceId = { ideal: prefs.camId }
  const audio = prefs.micId ? { deviceId: { ideal: prefs.micId } } : true
  return { video, audio }
}

function applyEnabledStates() {
  const s = stream.value
  if (!s) return
  const v = s.getVideoTracks()[0]
  const a = s.getAudioTracks()[0]
  if (v) v.enabled = camOn.value
  if (a) a.enabled = audioOn.value
}

async function enumerate() {
  if (!navigator.mediaDevices?.enumerateDevices) return
  try {
    const all = await navigator.mediaDevices.enumerateDevices()
    videoInputs.value = all.filter((d) => d.kind === 'videoinput')
    audioInputs.value = all.filter((d) => d.kind === 'audioinput')
  } catch {
    // ignore
  }
}

// Acquire (or re-acquire) the real stream. Falls back to a ghost stream so the
// pipeline still works with no camera.
async function acquire() {
  releaseStreamOnly()
  const secure = window.isSecureContext

  if (!navigator.mediaDevices?.getUserMedia) {
    stream.value = makeGhostStream(prefs.handle || 'NO SIGNAL')
    usingGhost.value = true
    notice.value = secure
      ? 'Camera unavailable. Using a placeholder static stream.'
      : 'No camera in an insecure context. Serve over http://localhost. Using a placeholder static stream.'
    active.value = true
    return stream.value
  }

  try {
    stream.value = await navigator.mediaDevices.getUserMedia(constraints())
    usingGhost.value = false
    notice.value = ''
    applyEnabledStates()
    await enumerate()
    startMeter()
  } catch (e) {
    stream.value = makeGhostStream(prefs.handle || 'NO SIGNAL')
    usingGhost.value = true
    notice.value = 'Camera or mic blocked (' + e.name + '). Using a placeholder static stream.'
  }

  active.value = !!stream.value
  return stream.value
}

// Used by the call: reuse the preview stream if there is one, otherwise acquire.
async function ensureStream() {
  if (stream.value) return stream.value
  return acquire()
}

async function startPreview() {
  await acquire()
}

async function setCamera(deviceId) {
  prefs.camId = deviceId || ''
  if (active.value && !usingGhost.value) {
    await acquire()
    replaceHandler?.(stream.value)
  }
}

async function setMic(deviceId) {
  prefs.micId = deviceId || ''
  if (active.value && !usingGhost.value) {
    await acquire()
    replaceHandler?.(stream.value)
  }
}

function toggleCam() {
  const t = stream.value?.getVideoTracks()[0]
  camOn.value = !camOn.value
  if (t) t.enabled = camOn.value
}

function toggleMic() {
  const t = stream.value?.getAudioTracks()[0]
  audioOn.value = !audioOn.value
  if (t) t.enabled = audioOn.value
}

// ---- mic level meter (preview only) ----
function startMeter() {
  stopMeter()
  const s = stream.value
  if (!s || usingGhost.value) return
  if (!s.getAudioTracks().length) return
  try {
    meterCtx = new (window.AudioContext || window.webkitAudioContext)()
    meterSource = meterCtx.createMediaStreamSource(s)
    const analyser = meterCtx.createAnalyser()
    analyser.fftSize = 512
    meterSource.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    const loop = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      micLevel.value = audioOn.value ? Math.min(1, rms * 3) : 0
      meterRAF = requestAnimationFrame(loop)
    }
    loop()
  } catch {
    // ignore
  }
}

function stopMeter() {
  if (meterRAF) cancelAnimationFrame(meterRAF)
  meterRAF = null
  if (meterSource) {
    try {
      meterSource.disconnect()
    } catch {
      // ignore
    }
    meterSource = null
  }
  if (meterCtx) {
    try {
      meterCtx.close()
    } catch {
      // ignore
    }
    meterCtx = null
  }
  micLevel.value = 0
}

// Stop the tracks and timers but leave the public state flags alone.
function releaseStreamOnly() {
  stopMeter()
  if (staticRAF) cancelAnimationFrame(staticRAF)
  staticRAF = null
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
  }
  stream.value = null
}

// Full teardown. Called when leaving the lobby for setup, or on unload.
function release() {
  releaseStreamOnly()
  active.value = false
  usingGhost.value = false
  notice.value = ''
  micLevel.value = 0
}

// Canvas "dead channel" stream so the pipeline still works with no camera.
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
  const out = cv.captureStream(12)
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    const dst = ac.createMediaStreamDestination()
    const osc = ac.createOscillator()
    const g = ac.createGain()
    g.gain.value = 0
    osc.connect(g)
    g.connect(dst)
    osc.start()
    out.addTrack(dst.stream.getAudioTracks()[0])
  } catch {
    // no audio track is acceptable
  }
  return out
}

export function useMedia() {
  return {
    stream,
    active,
    usingGhost,
    notice,
    audioOn,
    camOn,
    micLevel,
    videoInputs,
    audioInputs,
    ensureStream,
    startPreview,
    setCamera,
    setMic,
    toggleCam,
    toggleMic,
    enumerate,
    release,
    setReplaceHandler,
  }
}
