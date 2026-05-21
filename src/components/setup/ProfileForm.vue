<script setup>
import { ref, computed, onMounted } from 'vue'
import { ShieldHalf } from 'lucide-vue-next'
import { useProfile } from '../../composables/useProfile.js'
import { OPTS, LANGS } from '../../lib/constants.js'
import { loadPlaces, statesForCountry } from '../../lib/places.js'
import PanelCard from '../ui/PanelCard.vue'
import FieldLabel from '../ui/FieldLabel.vue'
import TextField from '../ui/TextField.vue'
import SelectField from '../ui/SelectField.vue'
import RevealToggle from '../ui/RevealToggle.vue'
import ChipInput from '../ui/ChipInput.vue'
import CalloutNote from '../ui/CalloutNote.vue'

const { profile, reveal, toggleReveal, addTag, removeTag } = useProfile()

const placesData = ref(null)
const placesFailed = ref(false)

const countryOptions = computed(() => placesData.value?.countries || [])
const stateOptions = computed(() =>
  placesData.value ? statesForCountry(placesData.value, profile.country) : []
)

onMounted(async () => {
  try {
    placesData.value = await loadPlaces()
  } catch {
    placesFailed.value = true
  }
})

function onCountryChange(e) {
  profile.country = e.target.value
  profile.state = ''
}

const opts = OPTS
const langs = LANGS
</script>

<template>
  <PanelCard>
    <FieldLabel text="HANDLE" />
    <TextField v-model="profile.handle" :maxlength="24" placeholder="what should we call you on-air?" />
    <p class="hint">shown to everyone. no real names needed.</p>

    <div class="row" style="margin-top: 6px">
      <div class="col">
        <FieldLabel text="COUNTRY">
          <template #action><RevealToggle :shown="reveal.country" @toggle="toggleReveal('country')" /></template>
        </FieldLabel>
        <select v-if="!placesFailed" class="native" :value="profile.country" @change="onCountryChange">
          <option value="">{{ placesData ? 'pick or skip' : 'loading places' }}</option>
          <option v-for="c in countryOptions" :key="c.isoCode" :value="c.name">
            {{ (c.flag ? c.flag + ' ' : '') + c.name }}
          </option>
        </select>
        <TextField v-else v-model="profile.country" placeholder="e.g. USA" :maxlength="40" />
      </div>

      <div class="col">
        <FieldLabel text="STATE / REGION">
          <template #action><RevealToggle :shown="reveal.state" @toggle="toggleReveal('state')" /></template>
        </FieldLabel>
        <select v-if="!placesFailed" v-model="profile.state" class="native">
          <option value="">{{ stateOptions.length ? 'pick or skip' : 'pick a country first' }}</option>
          <option v-for="s in stateOptions" :key="s.name" :value="s.name">{{ s.name }}</option>
        </select>
        <TextField v-else v-model="profile.state" placeholder="e.g. Arizona" :maxlength="40" />
        <p class="hint">region only. never a city or address.</p>
      </div>

      <div class="col">
        <FieldLabel text="LANGUAGE">
          <template #action><RevealToggle :shown="reveal.language" @toggle="toggleReveal('language')" /></template>
        </FieldLabel>
        <SelectField v-model="profile.language" :options="langs" />
      </div>
    </div>

    <div class="row">
      <div class="col">
        <FieldLabel text="POLITICAL LEAN">
          <template #action><RevealToggle :shown="reveal.politics" @toggle="toggleReveal('politics')" /></template>
        </FieldLabel>
        <SelectField v-model="profile.politics" :options="opts.politics" />
      </div>
      <div class="col">
        <FieldLabel text="RELIGION">
          <template #action><RevealToggle :shown="reveal.religion" @toggle="toggleReveal('religion')" /></template>
        </FieldLabel>
        <SelectField v-model="profile.religion" :options="opts.religion" />
      </div>
    </div>

    <div class="row">
      <div class="col">
        <FieldLabel text="GENDER">
          <template #action><RevealToggle :shown="reveal.gender" @toggle="toggleReveal('gender')" /></template>
        </FieldLabel>
        <SelectField v-model="profile.gender" :options="opts.gender" />
      </div>
      <div class="col">
        <FieldLabel text="ORIENTATION">
          <template #action><RevealToggle :shown="reveal.orientation" @toggle="toggleReveal('orientation')" /></template>
        </FieldLabel>
        <SelectField v-model="profile.orientation" :options="opts.orientation" />
      </div>
    </div>

    <FieldLabel text="FANDOMS / OBSESSIONS" />
    <ChipInput
      :model-value="profile.fandoms"
      placeholder="type + enter: dune, formula1, black midi"
      @add="(v) => addTag('fandoms', v)"
      @remove="(i) => removeTag('fandoms', i)"
    />

    <FieldLabel text="FREE TAGS" />
    <ChipInput
      :model-value="profile.tags"
      placeholder="type + enter: nightowl, rustlang, vinyl, anarchist"
      @add="(v) => addTag('tags', v)"
      @remove="(i) => removeTag('tags', i)"
    />

    <CalloutNote tone="info" style="margin-top: 14px">
      <template #icon><ShieldHalf /></template>
      Match-only fields are bucketed before they leave your machine. The other person's browser checks
      compatibility without the raw value ever rendering on their screen.
    </CalloutNote>
  </PanelCard>
</template>

<style scoped>
.native {
  width: 100%;
  font-family: var(--font-code);
  font-size: 15px;
  padding: 9px 10px;
  background: #fff;
  color: var(--ink);
  border: var(--border-w) solid var(--border);
  outline: none;
}
.native:focus {
  border-color: var(--accent-strong);
  box-shadow: 3px 3px 0 0 var(--accent);
}
</style>
