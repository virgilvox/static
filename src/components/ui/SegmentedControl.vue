<script setup>
// Segmented control. Options are { id, label }. Single select.
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="seg" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.id"
      :class="{ sel: modelValue === opt.id }"
      @click="$emit('update:modelValue', opt.id)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: flex;
  flex-wrap: wrap;
  border: var(--border-w) solid var(--border);
  width: fit-content;
  max-width: 100%;
}
.seg button {
  font-family: var(--font-mono);
  font-size: 18px;
  padding: 5px 13px;
  background: #fff;
  color: var(--ink);
  border: none;
  border-right: var(--border-w) solid var(--border);
  cursor: pointer;
}
.seg button:last-child {
  border-right: none;
}
.seg button.sel {
  background: var(--ink);
  color: var(--accent);
}
</style>
