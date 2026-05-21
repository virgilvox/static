// Small id and text helpers shared across the app.

export function rid(n = 8) {
  return Math.random().toString(36).slice(2, 2 + n)
}

// HTML-escape for any value rendered into raw markup. Vue handles most of this
// for us, but a few labels are built as strings before insertion.
export function esc(s) {
  return (s + '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
}

// Normalize a free-typed tag into a safe, lowercase token.
export function normalizeTag(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 \-]/g, '')
}

// Normalize a frequency name. Lowercase, no leading hash, url-safe characters.
export function normalizeFreq(value) {
  return (
    (value || 'commons')
      .toString()
      .trim()
      .replace(/^#/, '')
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '') || 'commons'
  )
}

// Promise race against a timeout, used for network operations that should never
// hang the interface.
export function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error((what || 'operation') + ' timed out after ' + ms + 'ms')), ms)
    ),
  ])
}
