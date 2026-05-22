<script setup>
import { Video, VideoOff, Mic, MicOff, CameraOff, Power } from 'lucide-vue-next'
import { useMedia } from '../../composables/useMedia.js'
import { useProfile } from '../../composables/useProfile.js'
import PanelCard from '../ui/PanelCard.vue'
import FieldLabel from '../ui/FieldLabel.vue'
import BaseButton from '../ui/BaseButton.vue'
import CalloutNote from '../ui/CalloutNote.vue'
import VideoTile from '../call/VideoTile.vue'

// Camera and mic check before matching. Reuses the shared media stream, so the
// device and mute state chosen here carry straight into the call.
const {
  stream,
  active,
  usingGhost,
  notice,
  audioOn,
  camOn,
  micLevel,
  videoInputs,
  audioInputs,
  startPreview,
  setCamera,
  setMic,
  toggleCam,
  toggleMic,
  release,
} = useMedia()
const { prefs } = useProfile()

function labelFor(d, i, kind) {
  return d.label || `${kind} ${i + 1}`
}
</script>

<template>
  <PanelCard dark>
    <div class="head">
      <div>
        <div class="kick">// CAMERA + MIC</div>
        <p class="hint dim">Check yourself before you get matched. Your camera never touches the relay.</p>
      </div>
      <BaseButton v-if="active" variant="ghost" size="sm" @click="release"><Power /> Turn off</BaseButton>
    </div>

    <div v-if="!active" class="off">
      <BaseButton variant="cyan" @click="startPreview"><Video /> Turn on camera to preview</BaseButton>
      <p class="hint dim">You will be asked for camera and mic permission once.</p>
    </div>

    <div v-else class="on">
      <div class="preview">
        <VideoTile :stream="stream" label="PREVIEW" mirror muted />
      </div>

      <div class="controls">
        <div v-if="videoInputs.length > 1" class="picker">
          <FieldLabel text="CAMERA" dark />
          <select class="native" :value="prefs.camId" @change="setCamera($event.target.value)">
            <option value="">default camera</option>
            <option v-for="(d, i) in videoInputs" :key="d.deviceId" :value="d.deviceId">
              {{ labelFor(d, i, 'Camera') }}
            </option>
          </select>
        </div>

        <div v-if="audioInputs.length > 1" class="picker">
          <FieldLabel text="MICROPHONE" dark />
          <select class="native" :value="prefs.micId" @change="setMic($event.target.value)">
            <option value="">default mic</option>
            <option v-for="(d, i) in audioInputs" :key="d.deviceId" :value="d.deviceId">
              {{ labelFor(d, i, 'Mic') }}
            </option>
          </select>
        </div>

        <div class="toggles">
          <BaseButton variant="cyan" size="sm" @click="toggleCam">
            <component :is="camOn ? Video : VideoOff" /> {{ camOn ? 'Cam on' : 'Cam off' }}
          </BaseButton>
          <BaseButton variant="cyan" size="sm" @click="toggleMic">
            <component :is="audioOn ? Mic : MicOff" /> {{ audioOn ? 'Mic on' : 'Mic off' }}
          </BaseButton>
          <div class="meter" :title="audioOn ? 'mic level' : 'mic muted'">
            <div class="meter-fill" :style="{ width: Math.round(micLevel * 100) + '%' }"></div>
          </div>
        </div>

        <CalloutNote v-if="usingGhost && notice" tone="warn" dark>
          <template #icon><CameraOff /></template>
          {{ notice }}
        </CalloutNote>
      </div>
    </div>
  </PanelCard>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.hint.dim {
  color: var(--text-dim);
}
.off {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.on {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  margin-top: 12px;
  align-items: start;
}
.preview {
  max-width: 280px;
}
.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker .native {
  width: 100%;
  font-family: var(--font-code);
  font-size: 14px;
  padding: 8px 10px;
  background: #fff;
  color: var(--ink);
  border: var(--border-w) solid var(--border);
  outline: none;
}
.toggles {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.meter {
  flex: 1;
  min-width: 80px;
  height: 14px;
  border: var(--border-w) solid var(--text-mute);
  background: #000;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.06s linear;
}
@media (max-width: 640px) {
  .on {
    grid-template-columns: 1fr;
  }
  .preview {
    max-width: 100%;
  }
}
</style>
