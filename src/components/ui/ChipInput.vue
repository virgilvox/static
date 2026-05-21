<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { normalizeTag } from '../../lib/id.js'

// Type a tag and press enter or comma to add it. Click the x to remove.
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  max: { type: Number, default: 12 },
})
const emit = defineEmits(['add', 'remove'])

const draft = ref('')

function commit(e) {
  e.preventDefault()
  const value = normalizeTag(draft.value)
  if (value && !props.modelValue.includes(value) && props.modelValue.length < props.max) {
    emit('add', value)
  }
  draft.value = ''
}
</script>

<template>
  <div>
    <input
      v-model="draft"
      type="text"
      class="field"
      :placeholder="placeholder"
      @keydown.enter="commit"
      @keydown="(e) => e.key === ',' && commit(e)"
    />
    <div v-if="modelValue.length" class="chips">
      <span v-for="(tag, i) in modelValue" :key="tag" class="chip">
        {{ tag }}
        <button type="button" class="x" :aria-label="`remove ${tag}`" @click="$emit('remove', i)">
          <X />
        </button>
      </span>
    </div>
  </div>
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
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 18px;
  border: var(--border-w) solid var(--border);
  background: #fff;
  color: var(--ink);
  padding: 2px 10px;
  user-select: none;
}
.x {
  display: inline-flex;
  border: none;
  background: none;
  color: var(--danger);
  cursor: pointer;
  padding: 0;
}
.x :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
