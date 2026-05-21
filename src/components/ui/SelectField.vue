<script setup>
// Styled select. Pass options as an array of strings; the empty string renders
// as the placeholder label.
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'pick or skip' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <select class="field" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option v-for="opt in options" :key="opt" :value="opt">
      {{ opt === '' ? placeholder : opt }}
    </option>
  </select>
</template>

<style scoped>
.field {
  width: 100%;
  font-family: var(--font-code);
  font-size: 15px;
  padding: 9px 10px;
  background: #fff;
  color: var(--ink);
  border: var(--border-w) solid var(--border);
  outline: none;
}
.field:focus {
  border-color: var(--accent-strong);
  box-shadow: 3px 3px 0 0 var(--accent);
}
</style>
