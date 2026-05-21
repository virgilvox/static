<script setup>
import { computed } from 'vue'
import { RadioTower } from 'lucide-vue-next'
import { useClasp } from '../composables/useClasp.js'
import StatusPill from './ui/StatusPill.vue'
import SettingsMenu from './SettingsMenu.vue'

const { connected, statusText } = useClasp()
const statusLabel = computed(() => statusText.value)
</script>

<template>
  <header>
    <div class="bar">
      <div class="logo">STAT<span class="b">I</span>C</div>
      <div class="tag">// flip through strangers like dead channels</div>
      <StatusPill :on="connected">
        <template #icon><RadioTower /></template>
        {{ statusLabel }}
      </StatusPill>
      <SettingsMenu />
    </div>
  </header>
</template>

<style scoped>
header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: var(--bg-raised);
  border-bottom: 3px solid var(--accent);
}
.bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  max-width: var(--maxw);
  margin: 0 auto;
}
.logo {
  font-family: var(--font-display);
  font-size: var(--fs-logo);
  color: var(--text);
  letter-spacing: 1px;
  line-height: 1;
  text-shadow: 3px 3px 0 var(--accent), 5px 5px 0 var(--danger);
}
.logo .b {
  color: var(--accent);
}
.tag {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--accent-2);
  opacity: 0.8;
  flex: 1;
}
@media (max-width: 620px) {
  .logo {
    font-size: 24px;
  }
  .tag {
    display: none;
  }
}
</style>
