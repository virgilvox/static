import { ref } from 'vue'
import { normalizeFreq } from '../lib/id.js'

// The app is a three step flow: setup, lobby, call. The connection and media
// state must survive moving between them, so screen is plain reactive state
// rather than router navigation. This module is the single source of truth for
// which screen is showing and which frequency is tuned.

const screen = ref('setup') // 'setup' | 'lobby' | 'call'
const freq = ref('commons')

// Set true while auto-matching so that returning from a call can resume it.
const resumeAuto = ref(false)

function go(next) {
  screen.value = next
}

function tune(name) {
  freq.value = normalizeFreq(name)
}

export function useScreen() {
  return { screen, freq, resumeAuto, go, tune }
}
