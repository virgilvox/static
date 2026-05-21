<script setup>
import { ref, watch, onMounted } from 'vue'

// Wraps a video element and binds a MediaStream imperatively (srcObject cannot
// be set declaratively). Used for both the local preview and remote peers.
const props = defineProps({
  stream: { type: Object, default: null },
  label: { type: String, default: '' },
  mirror: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
})

const videoEl = ref(null)

function bind() {
  if (videoEl.value && props.stream) {
    videoEl.value.srcObject = props.stream
    videoEl.value.play?.().catch(() => {})
  }
}

onMounted(bind)
watch(() => props.stream, bind)
</script>

<template>
  <div class="vbox" :class="{ me: mirror }">
    <video ref="videoEl" autoplay playsinline :muted="muted"></video>
    <div class="vlabel">{{ label }}</div>
    <div v-if="$slots.badge" class="vbadge"><slot name="badge" /></div>
  </div>
</template>

<style scoped>
.vbox {
  position: relative;
  background: #000;
  border: var(--border-w) solid var(--surface-dim);
  overflow: hidden;
}
video {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  background: #000;
  object-fit: cover;
}
.vbox.me video {
  transform: scaleX(-1);
}
.vlabel {
  position: absolute;
  left: 0;
  bottom: 0;
  font-family: var(--font-mono);
  font-size: 17px;
  background: rgba(0, 0, 0, 0.65);
  color: var(--accent);
  padding: 1px 8px;
  letter-spacing: 1px;
}
.vbadge {
  position: absolute;
  right: 0;
  top: 0;
  padding: 4px;
}
</style>
