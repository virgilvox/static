<script setup>
import { ref } from 'vue'
import { IdCard, Import, Save, FolderOpen, Trash2 } from 'lucide-vue-next'
import { useProfile } from '../../composables/useProfile.js'
import BaseButton from '../ui/BaseButton.vue'

const { passports, exportPassport, importPassport, savePassport, loadSavedPassport, deleteSavedPassport } =
  useProfile()

const flash = ref('')
function flashLabel(text) {
  flash.value = text
  setTimeout(() => (flash.value = ''), 1400)
}

async function copyPassport() {
  const str = exportPassport()
  try {
    await navigator.clipboard.writeText(str)
    flashLabel('passport copied')
  } catch {
    window.prompt('Copy your passport:', str)
  }
}

function loadPassport() {
  const str = (window.prompt('Paste a STATIC passport:') || '').trim()
  if (!str) return
  try {
    importPassport(str)
    flashLabel('passport loaded')
  } catch {
    flashLabel('that passport is scrambled')
  }
}

function saveNamed() {
  const name = (window.prompt('Name this identity:', '') || '').trim()
  savePassport(name)
  flashLabel('identity saved')
}
</script>

<template>
  <div>
    <div class="btnrow">
      <BaseButton variant="ghost" size="sm" @click="copyPassport"><IdCard /> Copy passport</BaseButton>
      <BaseButton variant="ghost" size="sm" @click="loadPassport"><Import /> Load passport</BaseButton>
      <BaseButton variant="ghost" size="sm" @click="saveNamed"><Save /> Save identity</BaseButton>
      <span v-if="flash" class="flash">{{ flash }}</span>
    </div>
    <p class="hint">
      A passport is your whole profile crammed into one shareable string. Paste it back next time instead
      of logging in. It lives only with you.
    </p>

    <div v-if="passports.length" class="saved">
      <div class="saved-title">// saved identities on this device</div>
      <div class="saved-list">
        <div v-for="p in passports" :key="p.id" class="saved-item">
          <span class="saved-name">{{ p.name || 'untitled' }}</span>
          <span class="saved-actions">
            <button class="mini" title="Load" @click="loadSavedPassport(p.id)"><FolderOpen /></button>
            <button class="mini danger" title="Delete" @click="deleteSavedPassport(p.id)"><Trash2 /></button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btnrow {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.flash {
  font-family: var(--font-mono);
  font-size: 17px;
  color: var(--accent);
}
.hint {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--text-mute);
  margin-top: 8px;
}
.saved {
  margin-top: 16px;
}
.saved-title {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--accent-2);
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.saved-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.saved-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: var(--border-w) solid var(--text-mute);
  padding: 4px 6px 4px 12px;
}
.saved-name {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-actions {
  display: inline-flex;
  gap: 4px;
}
.mini {
  display: inline-flex;
  background: transparent;
  border: 1px solid var(--text-mute);
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
}
.mini:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.mini.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}
.mini :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
