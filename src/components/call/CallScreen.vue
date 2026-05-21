<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { CameraOff, Signal, SignalLow, SignalMedium } from 'lucide-vue-next'
import { useCall } from '../../composables/useCall.js'
import { useProfile } from '../../composables/useProfile.js'
import { useScreen } from '../../composables/useScreen.js'
import { REACTION_ICONS } from '../../lib/reactionIcons.js'
import VideoTile from './VideoTile.vue'
import CallControls from './CallControls.vue'
import ReactionBar from './ReactionBar.vue'
import ChatPanel from './ChatPanel.vue'
import CalloutNote from '../ui/CalloutNote.vue'

const {
  room,
  peerStatus,
  localStream,
  remoteTiles,
  reactions,
  quality,
  usingGhost,
  camNotice,
  toggleMic,
  toggleCam,
  next,
  hangup,
} = useCall()
const { profile } = useProfile()
const { freq } = useScreen()

const meLabel = computed(() => (profile.handle || 'YOU').toUpperCase())
const qualityIcon = computed(() =>
  quality.value === 'poor' ? SignalLow : quality.value === 'ok' ? SignalMedium : Signal
)

function onKey(e) {
  const tag = (e.target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea') return
  if (e.key === 'm') toggleMic()
  else if (e.key === 'v') toggleCam()
  else if (e.key === 'n') next()
  else if (e.key === 'Escape') hangup()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="wrap screen">
    <div class="call-head">
      <div>
        <div class="kick">// ON-AIR IN</div>
        <div class="room">#{{ freq }} / {{ room }}</div>
      </div>
      <div class="status-cluster">
        <span v-if="quality" class="quality" :class="quality">
          <component :is="qualityIcon" /> {{ quality }}
        </span>
        <span class="peer-status">{{ peerStatus }}</span>
      </div>
    </div>

    <CalloutNote v-if="usingGhost && camNotice" tone="warn" style="margin-bottom: 14px">
      <template #icon><CameraOff /></template>
      {{ camNotice }}
    </CalloutNote>

    <div class="call-body">
      <div class="stage">
        <div class="vid-grid">
          <VideoTile :stream="localStream" :label="meLabel" mirror muted />
          <VideoTile
            v-for="t in remoteTiles"
            :key="t.peerId"
            :stream="t.stream"
            :label="(t.handle || 'peer').toUpperCase()"
          />
        </div>

        <div class="react-overlay">
          <span v-for="r in reactions" :key="r.key" class="floater" :class="{ mine: r.peerId === 'me' }">
            <component :is="REACTION_ICONS[r.id]" />
          </span>
        </div>

        <CallControls />
        <div class="react-bar"><ReactionBar /></div>
        <p class="shortcuts">m mute / v cam / n next / esc hang up</p>
      </div>

      <aside class="side">
        <ChatPanel />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.screen {
  padding: 26px 18px;
}
.call-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.room {
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--accent-2);
}
.status-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
}
.peer-status {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--accent);
  border: var(--border-w) solid var(--accent);
  padding: 2px 10px;
}
.quality {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 16px;
  padding: 2px 8px;
  border: var(--border-w) solid currentColor;
}
.quality.good {
  color: var(--accent);
}
.quality.ok {
  color: var(--accent-2);
}
.quality.poor {
  color: var(--danger);
}
.quality :deep(svg) {
  width: 15px;
  height: 15px;
}
.call-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  align-items: start;
}
.stage {
  position: relative;
}
.vid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}
.react-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.floater {
  position: absolute;
  left: 18%;
  bottom: 90px;
  color: var(--accent-2);
  animation: rise 2.6s ease-out forwards;
}
.floater.mine {
  left: auto;
  right: 18%;
  color: var(--accent);
}
.floater :deep(svg) {
  width: 30px;
  height: 30px;
}
@keyframes rise {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  15% {
    opacity: 1;
    transform: translateY(-10px) scale(1.1);
  }
  100% {
    transform: translateY(-160px) scale(1);
    opacity: 0;
  }
}
.react-bar {
  margin-top: 12px;
}
.shortcuts {
  text-align: center;
  font-family: var(--font-code);
  font-size: 11px;
  color: var(--text-mute);
  margin-top: 10px;
  letter-spacing: 1px;
}
.side {
  position: sticky;
  top: 80px;
}
@media (max-width: 820px) {
  .call-body {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
  }
}
@media (prefers-reduced-motion: reduce) {
  .floater {
    animation-duration: 1.2s;
  }
}
</style>
