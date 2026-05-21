<script setup>
// Small monospace status indicator. `on` flips it to the accent color.
defineProps({
  on: { type: Boolean, default: false },
})
</script>

<template>
  <span class="status" :class="{ on }">
    <slot name="icon" />
    <slot />
  </span>
</template>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 18px;
  border: var(--border-w) solid var(--text-mute);
  padding: 2px 10px;
  color: var(--text-mute);
  white-space: nowrap;
}
.status.on {
  color: var(--accent);
  border-color: var(--accent);
}
.status :deep(svg) {
  width: 15px;
  height: 15px;
}
</style>
