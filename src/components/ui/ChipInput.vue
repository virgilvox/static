<script setup>
import { ref, computed, watch } from 'vue'
import { X, Plus } from 'lucide-vue-next'
import { normalizeTag } from '../../lib/id.js'

// A tag combobox. Type to filter the suggestion list, click a suggestion to add
// it, or press enter to add whatever you typed as a custom value. Selected tags
// render as removable chips.
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  max: { type: Number, default: 12 },
  suggestions: { type: Array, default: () => [] },
})
const emit = defineEmits(['add', 'remove'])

const draft = ref('')
const focused = ref(false)
const activeIndex = ref(-1)

const draftNorm = computed(() => normalizeTag(draft.value))
const atMax = computed(() => props.modelValue.length >= props.max)

// Suggestions not already chosen, filtered by the draft. Empty draft shows a
// sample so the existing options are discoverable.
const list = computed(() => {
  const chosen = new Set(props.modelValue)
  const q = draftNorm.value
  const pool = props.suggestions.filter((s) => !chosen.has(s))
  const matched = q ? pool.filter((s) => s.includes(q)) : pool
  return matched.slice(0, 8)
})

// Show an "add custom" affordance when the typed value is new.
const canAddCustom = computed(
  () => !!draftNorm.value && !props.modelValue.includes(draftNorm.value) && !atMax.value
)

const open = computed(() => focused.value && !atMax.value && (list.value.length > 0 || canAddCustom.value))

watch(draft, () => {
  activeIndex.value = -1
})

function commit(value) {
  const v = normalizeTag(value)
  if (v && !props.modelValue.includes(v) && !atMax.value) emit('add', v)
  draft.value = ''
  activeIndex.value = -1
}

function onEnter(e) {
  e.preventDefault()
  if (activeIndex.value >= 0 && activeIndex.value < list.value.length) {
    commit(list.value[activeIndex.value])
  } else if (draftNorm.value) {
    commit(draftNorm.value)
  }
}

function onComma(e) {
  if (e.key !== ',') return
  if (draftNorm.value) {
    e.preventDefault()
    commit(draftNorm.value)
  }
}

function move(delta) {
  if (!open.value) return
  const n = list.value.length
  if (!n) return
  const next = activeIndex.value + delta
  activeIndex.value = next < 0 ? -1 : next >= n ? n - 1 : next
}

function onBlur() {
  // Suggestion clicks use mousedown.prevent, so they fire without blurring.
  focused.value = false
}
</script>

<template>
  <div class="combo">
    <div class="combo-field">
      <input
        v-model="draft"
        type="text"
        class="field"
        role="combobox"
        :aria-expanded="open"
        autocomplete="off"
        :placeholder="atMax ? `max ${max} reached` : placeholder"
        :disabled="atMax"
        @focus="focused = true"
        @blur="onBlur"
        @keydown.enter="onEnter"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.esc="focused = false"
        @keydown="onComma"
      />

      <div v-if="open" class="menu" role="listbox">
        <button
          v-for="(s, i) in list"
          :key="s"
          type="button"
          role="option"
          class="opt"
          :class="{ active: i === activeIndex }"
          :aria-selected="i === activeIndex"
          @mousedown.prevent="commit(s)"
          @mouseenter="activeIndex = i"
        >
          {{ s }}
        </button>
        <button v-if="canAddCustom" type="button" class="opt custom" @mousedown.prevent="commit(draftNorm)">
          <Plus /> add "{{ draftNorm }}"
        </button>
      </div>
    </div>

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
.combo-field {
  position: relative;
}
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
.field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 50;
  background: #fff;
  border: var(--border-w) solid var(--border);
  box-shadow: 4px 4px 0 0 var(--shadow);
  max-height: 240px;
  overflow-y: auto;
}
.opt {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  font-family: var(--font-code);
  font-size: 14px;
  padding: 7px 10px;
  background: #fff;
  color: var(--ink);
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
}
.opt:last-child {
  border-bottom: none;
}
.opt.active {
  background: var(--ink);
  color: var(--accent);
}
.opt.custom {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--accent-strong);
}
.opt.custom.active {
  color: var(--accent);
}
.opt :deep(svg) {
  width: 13px;
  height: 13px;
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
