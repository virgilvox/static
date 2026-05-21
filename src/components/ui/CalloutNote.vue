<script setup>
// Inline callout. tone 'info' (cyan) or 'warn' (red). Set dark on dark panels.
defineProps({
  tone: { type: String, default: 'info' },
  dark: { type: Boolean, default: false },
})
</script>

<template>
  <div class="note" :class="[tone, { dark }]">
    <span class="icon"><slot name="icon" /></span>
    <span class="body"><slot /></span>
  </div>
</template>

<style scoped>
.note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-family: var(--font-code);
  font-size: 12.5px;
  color: var(--on-surface);
  background: rgba(0, 229, 255, 0.12);
  border-left: 4px solid var(--accent-2-strong);
  padding: 10px 12px;
}
.note.warn {
  border-left-color: var(--danger);
  background: rgba(255, 45, 45, 0.1);
}
.note.dark {
  color: var(--text);
  background: rgba(0, 229, 255, 0.08);
}
.note.dark.warn {
  background: rgba(255, 45, 45, 0.12);
}
.icon {
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 1px;
}
.icon :deep(svg) {
  width: 15px;
  height: 15px;
}
.body :deep(code) {
  font-family: var(--font-code);
  background: rgba(0, 0, 0, 0.12);
  padding: 0 4px;
}
</style>
