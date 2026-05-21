// The only module that talks to localStorage. Everything is namespaced under a
// single prefix so "forget me" can wipe the app cleanly without touching other
// sites stored in the same browser.

const PREFIX = 'static.gdn:'

export const KEYS = {
  profile: 'profile',
  reveal: 'reveal',
  prefs: 'prefs',
  passports: 'passports',
  theme: 'theme',
  blocked: 'blocked',
}

function key(name) {
  return PREFIX + name
}

export function load(name, fallback = null) {
  try {
    const raw = localStorage.getItem(key(name))
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value))
  } catch {
    // Storage can be full or blocked (private mode). The app still works in
    // memory for the session, so we swallow the error rather than crash.
  }
}

export function remove(name) {
  try {
    localStorage.removeItem(key(name))
  } catch {
    // ignore
  }
}

// Wipe every key this app owns. Backs the "forget me" control.
export function forgetEverything() {
  try {
    const doomed = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

// Rough byte estimate of what we are storing, for the privacy panel readout.
export function storageFootprint() {
  let bytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) {
        bytes += k.length + (localStorage.getItem(k) || '').length
      }
    }
  } catch {
    // ignore
  }
  return bytes
}
