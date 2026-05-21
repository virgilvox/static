<script setup>
import { Phone } from 'lucide-vue-next'
import { useLobby } from '../composables/useLobby.js'
import { useScreen } from '../composables/useScreen.js'
import BaseButton from './ui/BaseButton.vue'

const { pendingInvite, acceptInvite, declineInvite } = useLobby()
const { freq } = useScreen()
</script>

<template>
  <div v-if="pendingInvite" class="ring">
    <div class="box">
      <div class="kick danger">// INCOMING SIGNAL</div>
      <h3>{{ pendingInvite.handle }}</h3>
      <p class="why">wants to connect on #{{ freq }}</p>
      <div class="btnrow">
        <BaseButton variant="acid" @click="acceptInvite"><Phone /> Connect</BaseButton>
        <BaseButton variant="ghost" size="sm" @click="declineInvite">Pass</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ring {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.box {
  background: var(--surface);
  color: var(--on-surface);
  border: 3px solid var(--danger);
  box-shadow: 8px 8px 0 0 var(--danger);
  padding: 24px;
  max-width: 380px;
  text-align: center;
}
.kick.danger {
  color: var(--danger);
}
h3 {
  color: var(--on-surface);
  margin: 6px 0;
}
.why {
  font-family: var(--font-code);
  font-size: 13px;
  margin-bottom: 8px;
}
.btnrow {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
