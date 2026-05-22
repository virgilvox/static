<script setup>
import { ref, computed, watch } from 'vue'
import { Radio, Shuffle, ArrowLeft, Users, TriangleAlert, PlugZap, RotateCw, Loader } from 'lucide-vue-next'
import { useApp } from '../../composables/useApp.js'
import { useLobby } from '../../composables/useLobby.js'
import { useProfile } from '../../composables/useProfile.js'
import { useScreen } from '../../composables/useScreen.js'
import { FILTER_AXES } from '../../lib/constants.js'
import { normalizeFreq } from '../../lib/id.js'
import PanelCard from '../ui/PanelCard.vue'
import FieldLabel from '../ui/FieldLabel.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import StatusPill from '../ui/StatusPill.vue'
import CalloutNote from '../ui/CalloutNote.vue'
import BaseButton from '../ui/BaseButton.vue'
import LobbyCard from './LobbyCard.vue'
import DevicePreview from './DevicePreview.vue'

const { connState, retryConnect, backToSetup } = useApp()
const {
  mode,
  modes,
  modeHint,
  filter,
  poolList,
  poolCount,
  scanning,
  myCard,
  setMode,
  toggleFilterAxis,
  toggleNeedTag,
  startAuto,
  stopAuto,
  joinFrequency,
  ringPeer,
} = useLobby()
const { prefs } = useProfile()
const { freq } = useScreen()

// A reactive draft so typing survives the re-renders triggered by incoming
// lobby cards. It syncs down when the tuned frequency changes elsewhere.
const freqInput = ref('#' + freq.value)
watch(freq, (f) => {
  freqInput.value = '#' + f
})
function tune() {
  const name = normalizeFreq(freqInput.value)
  prefs.lastFreq = name
  joinFrequency(name)
}

function onMode(id) {
  setMode(id)
  prefs.lastMode = id
}

const axes = FILTER_AXES
const mine = computed(() => myCard())

function onFind() {
  if (scanning.value) stopAuto()
  else startAuto()
}
</script>

<template>
  <section class="wrap stack screen">
    <DevicePreview />

    <PanelCard dark>
      <CalloutNote v-if="connState === 'connecting'" tone="warn" dark>
        <template #icon><Loader class="spin" /></template>
        dialing the relay
      </CalloutNote>
      <CalloutNote v-else-if="connState === 'fail'" tone="warn" dark>
        <template #icon><PlugZap /></template>
        Could not reach the relay. If you are running your own router, check the address on the setup
        screen.
        <BaseButton variant="cyan" size="sm" style="margin-left: 8px" @click="retryConnect">
          <RotateCw /> Retry
        </BaseButton>
      </CalloutNote>

      <div class="lobby-head">
        <div>
          <div class="kick">// TUNED TO</div>
          <div class="freq">#{{ freq }}</div>
        </div>
        <div class="tune">
          <input
            v-model="freqInput"
            class="freq-input"
            placeholder="#frequency"
            @keydown.enter="tune"
          />
          <BaseButton variant="cyan" size="sm" @click="tune"><Radio /> Tune</BaseButton>
        </div>
      </div>
      <p class="hint dim">
        A frequency is just a shared channel name. Anyone on the same frequency shares this lobby. Default
        <b>#commons</b>. Pick a private word to make a hidden room.
      </p>

      <FieldLabel text="HOW DO YOU WANT TO BE PAIRED?" dark />
      <SegmentedControl :model-value="mode" :options="modes" @update:model-value="onMode" />
      <p class="hint dim">{{ modeHint }}</p>

      <div v-if="mode === 'filter'" class="filter-box">
        <FieldLabel text="MUST AGREE ON" dark />
        <div class="chips">
          <button
            v-for="ax in axes"
            :key="ax"
            class="fchip"
            :class="{ on: filter.axes.has(ax) }"
            @click="toggleFilterAxis(ax)"
          >
            {{ ax }}
          </button>
        </div>
        <button class="needtag" :class="{ on: filter.needTag }" @click="toggleNeedTag">
          must share a tag/fandom: {{ filter.needTag ? 'YES' : 'NO' }}
        </button>
      </div>

      <div class="btnrow">
        <BaseButton v-if="mode !== 'browse'" variant="acid" @click="onFind">
          <component :is="scanning ? Loader : Shuffle" :class="{ spin: scanning }" />
          {{ scanning ? 'Scanning the dial' : 'Find me a match' }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="backToSetup"><ArrowLeft /> Back</BaseButton>
        <StatusPill :on="true" class="pool"><template #icon><Users /></template> {{ poolCount }} waiting</StatusPill>
      </div>

      <CalloutNote tone="warn" dark style="margin-top: 14px">
        <template #icon><TriangleAlert /></template>
        This runs on the public CLASP relay. Do not share anything you would not shout in a public square.
        Camera and mic stay peer to peer and never touch the relay.
      </CalloutNote>
    </PanelCard>

    <div v-if="mode === 'browse'">
      <h3 class="browse-title">Who's waiting <span class="live">// live</span></h3>
      <div v-if="poolList.length" class="cards">
        <LobbyCard v-for="c in poolList" :key="c.sid" :card="c" :mine="mine" @ring="(sid) => ringPeer(sid)" />
      </div>
      <div v-else class="empty">// no signal // open another tab or send a friend your frequency</div>
    </div>
  </section>
</template>

<style scoped>
.screen {
  padding: 26px 18px;
}
.lobby-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.freq {
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--accent-2);
}
.tune {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.freq-input {
  width: 160px;
  font-family: var(--font-code);
  font-size: 15px;
  padding: 7px 10px;
  background: #fff;
  color: var(--ink);
  border: var(--border-w) solid var(--border);
  outline: none;
}
.hint.dim {
  color: var(--text-dim);
}
.filter-box {
  margin-top: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fchip {
  font-family: var(--font-mono);
  font-size: 18px;
  border: var(--border-w) solid var(--border);
  background: #fff;
  color: var(--ink);
  padding: 2px 10px;
  cursor: pointer;
}
.fchip.on {
  background: var(--ink);
  color: var(--accent);
}
.needtag {
  display: inline-flex;
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 15px;
  border: var(--border-w) solid var(--border);
  background: #fff;
  color: var(--ink);
  padding: 2px 10px;
  cursor: pointer;
}
.needtag.on {
  background: var(--accent-2-strong);
  color: #fff;
  border-color: var(--accent-2-strong);
}
.btnrow {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}
.pool {
  margin-left: auto;
}
.browse-title {
  margin-top: 6px;
}
.live {
  font-family: var(--font-mono);
  color: var(--accent-2);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.empty {
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--text-mute);
  text-align: center;
  padding: 40px 0;
}
</style>
