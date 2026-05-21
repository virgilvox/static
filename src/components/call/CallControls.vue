<script setup>
import { Mic, MicOff, Video, VideoOff, Circle, Square, SkipForward, Ban, PhoneOff } from 'lucide-vue-next'
import { useCall } from '../../composables/useCall.js'
import BaseButton from '../ui/BaseButton.vue'

const { audioOn, camOn, recording, toggleMic, toggleCam, toggleRecording, next, hangup, blockReport } =
  useCall()

function onRecord() {
  if (recording.value) {
    toggleRecording()
    return
  }
  const ok = window.confirm(
    'Recording composites everyone on the call and notifies all parties with a visible REC banner. Start recording?'
  )
  if (ok) toggleRecording()
}

function onBlock() {
  if (window.confirm('Block and report this person? The connection ends and you will not be paired again this session.')) {
    blockReport()
  }
}
</script>

<template>
  <div class="controls">
    <BaseButton variant="cyan" size="sm" @click="toggleMic">
      <component :is="audioOn ? Mic : MicOff" /> {{ audioOn ? 'Mute' : 'Unmute' }}
    </BaseButton>
    <BaseButton variant="cyan" size="sm" @click="toggleCam">
      <component :is="camOn ? Video : VideoOff" /> {{ camOn ? 'Cam off' : 'Cam on' }}
    </BaseButton>
    <BaseButton variant="rec" size="sm" @click="onRecord">
      <component :is="recording ? Square : Circle" /> {{ recording ? 'Stop' : 'Record' }}
    </BaseButton>
    <BaseButton variant="acid" size="sm" @click="next"><SkipForward /> Next</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="onBlock"><Ban /> Block + report</BaseButton>
    <BaseButton variant="ghost" size="sm" @click="hangup"><PhoneOff /> Hang up</BaseButton>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 18px;
}
</style>
