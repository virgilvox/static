<script setup>
// A bordered card with the signature hard offset shadow. Light by default, or a
// dark "on-air" variant used for the lobby and call surfaces.
defineProps({
  dark: { type: Boolean, default: false },
})
</script>

<template>
  <div class="panel" :class="{ dk: dark }">
    <slot />
  </div>
</template>

<style scoped>
.panel {
  background: var(--surface);
  color: var(--on-surface);
  border: var(--border-w) solid var(--border);
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0 0 var(--shadow);
  padding: 18px;
}
.panel.dk {
  background: var(--bg-raised);
  color: var(--text);
  border-color: var(--accent);
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0 0 var(--shadow-dark);
}
</style>
