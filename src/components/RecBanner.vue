<script setup>
import { computed } from 'vue'
import { Disc } from 'lucide-vue-next'
import { useCall } from '../composables/useCall.js'

const { recording, remoteRecording } = useCall()
const visible = computed(() => recording.value || remoteRecording.value)
</script>

<template>
  <div v-if="visible" class="recdot">
    <Disc /> REC // all parties notified
  </div>
</template>

<style scoped>
.recdot {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 20px;
  color: #fff;
  background: var(--danger);
  border: var(--border-w) solid #000;
  padding: 2px 12px;
  letter-spacing: 2px;
  box-shadow: 3px 3px 0 0 #000;
  animation: blink 1s steps(2) infinite;
}
.recdot :deep(svg) {
  width: 16px;
  height: 16px;
}
@keyframes blink {
  50% {
    opacity: 0.35;
  }
}
@media (prefers-reduced-motion: reduce) {
  .recdot {
    animation: none;
  }
}
</style>
