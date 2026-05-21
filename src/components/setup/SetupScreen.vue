<script setup>
import { ref } from 'vue'
import { SatelliteDish, Info } from 'lucide-vue-next'
import { useApp } from '../../composables/useApp.js'
import { useProfile } from '../../composables/useProfile.js'
import PanelCard from '../ui/PanelCard.vue'
import FieldLabel from '../ui/FieldLabel.vue'
import TextField from '../ui/TextField.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import TapeLabel from '../ui/TapeLabel.vue'
import CalloutNote from '../ui/CalloutNote.vue'
import BaseButton from '../ui/BaseButton.vue'
import ProfileForm from './ProfileForm.vue'
import PassportBar from './PassportBar.vue'

const { isAdult, goOnAir } = useApp()
const { prefs } = useProfile()

const ageError = ref(false)
const ageOptions = [
  { id: 'no', label: 'I am under 18' },
  { id: 'yes', label: 'I am 18 or older' },
]
const ageChoice = ref(isAdult.value ? 'yes' : 'no')

function onAge(v) {
  ageChoice.value = v
  isAdult.value = v === 'yes'
  if (isAdult.value) ageError.value = false
}

async function onGoOnAir() {
  const res = await goOnAir(prefs.lastFreq)
  if (!res.ok && res.reason === 'age') ageError.value = true
}
</script>

<template>
  <section class="wrap stack screen">
    <div>
      <TapeLabel>no login &nbsp;/&nbsp; no database &nbsp;/&nbsp; you hold your own identity</TapeLabel>
      <h2>Build a signal. Reveal what you want.</h2>
      <p class="lead">
        Every field is optional. Leave it all blank if you like. The trick: a field can be used to
        <b>match</b> you without ever being <b>shown</b> to the other person. Hit the eye to flip a field
        between <span class="ink-cyan">shown</span> and <span class="ink-mute">match-only</span>.
      </p>
    </div>

    <ProfileForm />

    <PanelCard>
      <FieldLabel text="AGE GATE" />
      <SegmentedControl :model-value="ageChoice" :options="ageOptions" @update:model-value="onAge" />
      <p class="hint">camera will not turn on until you confirm you are an adult.</p>
      <CalloutNote v-if="ageError" tone="warn" style="margin-top: 12px">
        <template #icon><Info /></template>
        STATIC is 18+. Confirm you are an adult to continue.
      </CalloutNote>
    </PanelCard>

    <PanelCard>
      <FieldLabel text="RELAY" />
      <TextField v-model="prefs.relay" :spellcheck="false" placeholder="wss://relay.clasp.to" />
      <p class="hint">
        The signaling relay. The public default works from a normal page. Running your own router? Use
        <code>ws://localhost:7330</code>.
      </p>
    </PanelCard>

    <div>
      <div class="btnrow">
        <BaseButton variant="acid" @click="onGoOnAir"><SatelliteDish /> Go on-air</BaseButton>
      </div>
      <div style="margin-top: 16px">
        <PassportBar />
      </div>
    </div>
  </section>
</template>

<style scoped>
.screen {
  padding: 26px 18px;
}
.ink-cyan {
  color: var(--accent-2-strong);
}
.ink-mute {
  color: var(--text-mute);
}
.btnrow {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
code {
  font-family: var(--font-code);
  background: rgba(0, 0, 0, 0.18);
  padding: 0 4px;
}
</style>
