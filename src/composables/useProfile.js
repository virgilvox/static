import { reactive, ref, watch } from 'vue'
import { load, save, forgetEverything, KEYS } from '../lib/storage.js'
import { encodePassport, decodePassport } from '../lib/passport.js'
import { rid } from '../lib/id.js'

// The user's identity and preferences. All of it lives in localStorage only.
// Nothing here is sent anywhere until the user goes on-air, and even then only
// the fields they choose to reveal leave the browser in readable form.

const emptyProfile = () => ({
  handle: '',
  country: '',
  state: '',
  language: '',
  politics: '',
  religion: '',
  gender: '',
  orientation: '',
  fandoms: [],
  tags: [],
})

const defaultReveal = () => ({
  country: true,
  state: true,
  language: true,
  politics: true,
  religion: false,
  gender: true,
  orientation: false,
})

const defaultPrefs = () => ({
  relay: 'wss://relay.clasp.to',
  lastFreq: 'commons',
  lastMode: 'roulette',
  camId: '',
  micId: '',
})

const profile = reactive(Object.assign(emptyProfile(), load(KEYS.profile, {})))
const reveal = reactive(Object.assign(defaultReveal(), load(KEYS.reveal, {})))
const prefs = reactive(Object.assign(defaultPrefs(), load(KEYS.prefs, {})))
const passports = ref(load(KEYS.passports, []))

// Persist on any change. Deep watch is fine here; these objects are tiny.
watch(profile, () => save(KEYS.profile, { ...profile }), { deep: true })
watch(reveal, () => save(KEYS.reveal, { ...reveal }), { deep: true })
watch(prefs, () => save(KEYS.prefs, { ...prefs }), { deep: true })

function applyProfile(next, nextReveal) {
  Object.assign(profile, emptyProfile(), next || {})
  if (nextReveal) Object.assign(reveal, defaultReveal(), nextReveal)
}

function toggleReveal(key) {
  reveal[key] = !reveal[key]
}

function addTag(key, value) {
  if (!value) return
  if (!profile[key].includes(value) && profile[key].length < 12) {
    profile[key].push(value)
  }
}

function removeTag(key, index) {
  profile[key].splice(index, 1)
}

// ---- passport string (copy / paste) ----
function exportPassport() {
  return encodePassport({ ...profile }, { ...reveal })
}

function importPassport(str) {
  const { profile: p, reveal: r } = decodePassport(str)
  applyProfile(p, r)
}

// ---- named saved passports (multiple identities) ----
function savePassport(name) {
  const entry = {
    id: rid(6),
    name: (name || profile.handle || 'untitled').slice(0, 40),
    profile: { ...profile },
    reveal: { ...reveal },
    savedAt: Date.now(),
  }
  passports.value = [entry, ...passports.value].slice(0, 12)
  save(KEYS.passports, passports.value)
  return entry
}

function loadSavedPassport(id) {
  const entry = passports.value.find((p) => p.id === id)
  if (!entry) return
  applyProfile(entry.profile, entry.reveal)
}

function deleteSavedPassport(id) {
  passports.value = passports.value.filter((p) => p.id !== id)
  save(KEYS.passports, passports.value)
}

// ---- forget me ----
function forgetMe() {
  forgetEverything()
  applyProfile(emptyProfile(), defaultReveal())
  Object.assign(prefs, defaultPrefs())
  passports.value = []
}

export function useProfile() {
  return {
    profile,
    reveal,
    prefs,
    passports,
    applyProfile,
    toggleReveal,
    addTag,
    removeTag,
    exportPassport,
    importPassport,
    savePassport,
    loadSavedPassport,
    deleteSavedPassport,
    forgetMe,
  }
}
