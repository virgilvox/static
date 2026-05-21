<script setup>
import { computed } from 'vue'
import { Phone } from 'lucide-vue-next'
import { matchPct } from '../../lib/match.js'
import BaseButton from '../ui/BaseButton.vue'

// One waiting stranger, rendered from the public part of their card only.
const props = defineProps({
  card: { type: Object, required: true },
  mine: { type: Object, required: true },
})
defineEmits(['ring'])

const pct = computed(() => matchPct(props.mine, props.card))
const meta = computed(() => {
  const d = props.card.display || {}
  return ['country', 'state', 'language', 'politics', 'gender', 'orientation', 'religion']
    .map((k) => d[k])
    .filter(Boolean)
})
const tags = computed(() => {
  const d = props.card.display || {}
  return [...(d.fandoms || []), ...(d.tags || [])].slice(0, 6)
})
</script>

<template>
  <div class="card">
    <div class="score">{{ pct }}%</div>
    <div class="handle">{{ card.display?.handle || 'anon' }}</div>
    <div class="meta">
      <template v-if="meta.length">{{ meta.join(' / ') }}</template>
      <i v-else>no descriptors shared</i>
    </div>
    <div v-if="tags.length" class="ctags">
      <span v-for="t in tags" :key="t" class="ct">{{ t }}</span>
    </div>
    <BaseButton variant="cyan" size="sm" @click="$emit('ring', card.sid)"><Phone /> Ring</BaseButton>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--bg-raised);
  border: var(--border-w) solid var(--surface-dim);
  padding: 14px;
  box-shadow: 5px 5px 0 0 var(--shadow-dark);
}
.score {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 22px;
  color: var(--accent);
}
.handle {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--text);
  padding-right: 48px;
}
.meta {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 6px;
}
.ctags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 8px 0;
}
.ct {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--accent-2);
  border: 1px solid var(--accent-2-strong);
  padding: 0 6px;
}
</style>
