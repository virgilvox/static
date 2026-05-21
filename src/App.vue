<script setup>
import { onMounted } from 'vue'
import { useApp } from './composables/useApp.js'
import { useScreen } from './composables/useScreen.js'
import AppHeader from './components/AppHeader.vue'
import RecBanner from './components/RecBanner.vue'
import IncomingRing from './components/IncomingRing.vue'
import SetupScreen from './components/setup/SetupScreen.vue'
import LobbyScreen from './components/lobby/LobbyScreen.vue'
import CallScreen from './components/call/CallScreen.vue'

const { init } = useApp()
const { screen } = useScreen()

onMounted(init)
</script>

<template>
  <AppHeader />
  <RecBanner />

  <main>
    <SetupScreen v-if="screen === 'setup'" />
    <LobbyScreen v-else-if="screen === 'lobby'" />
    <CallScreen v-else-if="screen === 'call'" />
  </main>

  <IncomingRing />

  <footer>
    STATIC // signaling and presence over
    <a href="https://github.com/lumencanvas/clasp" target="_blank" rel="noopener">CLASP</a>
    // media peer to peer over WebRTC // no accounts, no server, no logs you did not make yourself
  </footer>
</template>

<style scoped>
main {
  min-height: 50vh;
}
footer {
  padding: 30px 18px 50px;
  text-align: center;
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--text-mute);
}
</style>
