<script setup>
// The STATIC button. Hard offset shadow, marker typeface, physical press.
defineProps({
  variant: { type: String, default: 'acid' }, // 'acid' | 'cyan' | 'ghost' | 'rec'
  size: { type: String, default: 'md' }, // 'md' | 'sm'
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button :type="type" :disabled="disabled" class="btn" :class="[`v-${variant}`, `s-${size}`]">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  letter-spacing: 1px;
  border: var(--border-w) solid var(--border);
  color: var(--ink);
  cursor: pointer;
  box-shadow: 4px 4px 0 0 var(--border);
  transition: var(--press);
  line-height: 1;
}
.btn:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 0 var(--border);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.s-md {
  font-size: 20px;
  padding: 10px 20px;
}
.s-sm {
  font-size: 15px;
  padding: 7px 13px;
  box-shadow: 3px 3px 0 0 var(--border);
}
.v-acid {
  background: var(--accent);
}
.v-cyan {
  background: var(--accent-2);
}
.v-rec {
  background: var(--danger);
  color: #fff;
  border-color: #000;
}
.v-ghost {
  background: transparent;
  color: var(--text);
  border-color: var(--text);
  box-shadow: 4px 4px 0 0 var(--shadow);
}
.v-ghost.s-sm {
  box-shadow: 3px 3px 0 0 var(--shadow);
}
.btn :deep(svg) {
  width: 1em;
  height: 1em;
}
</style>
