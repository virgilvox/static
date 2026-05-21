<script setup>
import { REACTIONS } from '../../lib/constants.js'
import { REACTION_ICONS } from '../../lib/reactionIcons.js'
import { useCall } from '../../composables/useCall.js'

// Quick reactions, sent over the data channel and echoed locally.
const { sendReaction } = useCall()
</script>

<template>
  <div class="reactions">
    <button
      v-for="r in REACTIONS"
      :key="r.id"
      class="rbtn"
      :title="r.label"
      :aria-label="r.label"
      @click="sendReaction(r.id)"
    >
      <component :is="REACTION_ICONS[r.id]" />
    </button>
  </div>
</template>

<style scoped>
.reactions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.rbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: var(--border-w) solid var(--text-mute);
  color: var(--text);
  cursor: pointer;
}
.rbtn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.rbtn :deep(svg) {
  width: 17px;
  height: 17px;
}
</style>
