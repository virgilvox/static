<script setup>
import { Eye, EyeOff } from 'lucide-vue-next'

// Flips a field between "shown" (rendered on the other person's screen) and
// "match-only" (used for pairing but never displayed).
defineProps({
  shown: { type: Boolean, default: true },
})
defineEmits(['toggle'])
</script>

<template>
  <button type="button" class="eye" :class="shown ? 'shown' : 'hidden'" @click="$emit('toggle')">
    <component :is="shown ? Eye : EyeOff" />
    {{ shown ? 'shown' : 'match-only' }}
  </button>
</template>

<style scoped>
.eye {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 15px;
  border: var(--border-w) solid var(--border);
  padding: 1px 8px;
  cursor: pointer;
  white-space: nowrap;
}
.eye.shown {
  background: var(--accent-2-strong);
  color: #fff;
  border-color: var(--accent-2-strong);
}
.eye.hidden {
  background: #fff;
  color: var(--text-mute);
}
.eye :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
