<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  maxlength: { type: [Number, String], default: null },
  spellcheck: { type: Boolean, default: true },
})
defineEmits(['update:modelValue', 'enter'])
</script>

<template>
  <input
    type="text"
    class="field"
    :value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :spellcheck="spellcheck"
    @input="$emit('update:modelValue', $event.target.value)"
    @keydown.enter="$emit('enter', $event)"
  />
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
