// A passport is an entire profile (fields plus reveal settings) packed into one
// shareable string. It never leaves the browser unless the user copies it.
// Format: STATIC1.<base64 of utf8 json>

import { PASSPORT_PREFIX } from './constants.js'

export function encodePassport(profile, reveal) {
  const blob = { p: profile, r: reveal }
  return PASSPORT_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(blob))))
}

export function decodePassport(str) {
  const trimmed = (str || '').trim()
  if (!trimmed.startsWith(PASSPORT_PREFIX)) {
    throw new Error('Not a STATIC passport.')
  }
  const blob = JSON.parse(decodeURIComponent(escape(atob(trimmed.slice(PASSPORT_PREFIX.length)))))
  return { profile: blob.p || {}, reveal: blob.r || {} }
}
