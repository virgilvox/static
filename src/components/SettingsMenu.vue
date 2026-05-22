<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Settings, Trash2, Check } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme.js'
import { useProfile } from '../composables/useProfile.js'
import { storageFootprint } from '../lib/storage.js'
import BaseButton from './ui/BaseButton.vue'

// Theme picker plus the "forget me" control. Everything STATIC knows about a
// person lives in this browser; this menu is where they wipe it.
const { theme, themes, setTheme } = useTheme()
const { forgetMe } = useProfile()

const open = ref(false)
const confirming = ref(false)
const root = ref(null)
const footprint = computed(() => storageFootprint())

function doForget() {
  forgetMe()
  confirming.value = false
  open.value = false
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) {
    open.value = false
    confirming.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="root" class="settings">
    <button class="gear" :aria-expanded="open" aria-label="Settings" @click="open = !open">
      <Settings />
    </button>

    <div v-if="open" class="sheet">
      <div class="grp">
        <div class="grp-title">// look</div>
        <button
          v-for="t in themes"
          :key="t.id"
          class="opt"
          :class="{ active: theme === t.id }"
          @click="setTheme(t.id)"
        >
          <Check v-if="theme === t.id" class="tick" />
          <span v-else class="tick-space" />
          {{ t.label }}
        </button>
      </div>

      <div class="grp">
        <div class="grp-title">// your data</div>
        <p class="blurb">
          Profile and preferences are stored only in this browser, about
          {{ Math.max(1, Math.round(footprint / 102.4) / 10) }} KB. Nothing is on a server.
        </p>
        <template v-if="!confirming">
          <BaseButton variant="ghost" size="sm" @click="confirming = true">
            <Trash2 /> Forget me
          </BaseButton>
        </template>
        <template v-else>
          <p class="blurb warn">This wipes your passport, saved identities, and settings on this device.</p>
          <div class="confirm-row">
            <BaseButton variant="rec" size="sm" @click="doForget">Erase everything</BaseButton>
            <BaseButton variant="ghost" size="sm" @click="confirming = false">Keep it</BaseButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  position: relative;
}
.gear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: var(--border-w) solid var(--text-mute);
  color: var(--text);
  cursor: pointer;
}
.gear:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.gear :deep(svg) {
  width: 18px;
  height: 18px;
}
.sheet {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 300;
  width: 260px;
  background: var(--bg-raised);
  border: var(--border-w) solid var(--accent);
  box-shadow: 6px 6px 0 0 var(--shadow-dark);
  padding: 14px;
}
.grp + .grp {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dotted var(--text-mute);
}
.grp-title {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--accent);
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-family: var(--font-body);
  font-size: 15px;
  background: transparent;
  border: none;
  color: var(--text);
  padding: 6px 4px;
  cursor: pointer;
}
.opt:hover {
  color: var(--accent);
}
.opt.active {
  color: var(--accent);
}
.tick,
.tick-space {
  width: 15px;
  height: 15px;
}
.blurb {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 10px;
  line-height: 1.5;
}
.blurb.warn {
  color: var(--danger);
}
.confirm-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
