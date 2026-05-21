<script setup>
// Field label in the mono typeface. Optionally pairs with a reveal toggle on the
// right via the `action` slot.
defineProps({
  text: { type: String, required: true },
  dark: { type: Boolean, default: false },
})
</script>

<template>
  <div class="label-row" :class="{ dark }">
    <span class="fld">{{ text }}</span>
    <slot name="action" />
  </div>
</template>

<style scoped>
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 14px 0 4px;
}
.fld {
  font-family: var(--font-mono);
  font-size: 19px;
  color: var(--on-surface);
  letter-spacing: 1px;
}
.label-row.dark .fld {
  color: var(--accent-2);
}
</style>
