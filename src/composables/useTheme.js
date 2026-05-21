import { ref } from 'vue'
import { THEMES } from '../lib/constants.js'
import { load, save, KEYS } from '../lib/storage.js'

// Theme selection. Persisted, applied to the <html> data-theme attribute, which
// every design token in tokens.css keys off of.

const valid = THEMES.map((t) => t.id)
const stored = load(KEYS.theme, 'dead-channel')
const theme = ref(valid.includes(stored) ? stored : 'dead-channel')

function apply() {
  document.documentElement.setAttribute('data-theme', theme.value)
}

function setTheme(id) {
  if (!valid.includes(id)) return
  theme.value = id
  save(KEYS.theme, id)
  apply()
}

export function useTheme() {
  return { theme, themes: THEMES, setTheme, apply }
}
