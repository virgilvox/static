<script setup>
import { ref, watch, nextTick } from 'vue'
import { Send } from 'lucide-vue-next'
import { useCall } from '../../composables/useCall.js'

// Text chat over the peer to peer data channel. Never touches the relay.
const { messages, sendChat } = useCall()
const draft = ref('')
const listEl = ref(null)

function submit() {
  const text = draft.value.trim()
  if (!text) return
  sendChat(text)
  draft.value = ''
}

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  }
)
</script>

<template>
  <div class="chat">
    <div class="chat-head">// side channel</div>
    <div ref="listEl" class="msgs">
      <p v-if="!messages.length" class="empty">peer to peer text. nothing here is logged.</p>
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.from">
        <span class="who">{{ m.from === 'me' ? 'you' : m.handle }}</span>
        <span class="text">{{ m.text }}</span>
      </div>
    </div>
    <form class="composer" @submit.prevent="submit">
      <input v-model="draft" maxlength="500" placeholder="say something" />
      <button type="submit" aria-label="Send"><Send /></button>
    </form>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 240px;
  background: var(--bg-raised);
  border: var(--border-w) solid var(--surface-dim);
}
.chat-head {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--accent-2);
  letter-spacing: 1px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--surface-dim);
}
.msgs {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty {
  font-family: var(--font-code);
  font-size: 12px;
  color: var(--text-mute);
}
.msg {
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.4;
}
.msg .who {
  color: var(--accent);
  margin-right: 6px;
}
.msg.peer .who {
  color: var(--accent-2);
}
.msg .text {
  color: var(--text);
  word-break: break-word;
}
.composer {
  display: flex;
  border-top: 1px solid var(--surface-dim);
}
.composer input {
  flex: 1;
  font-family: var(--font-code);
  font-size: 13px;
  padding: 9px 10px;
  background: #000;
  color: var(--text);
  border: none;
  outline: none;
}
.composer button {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  background: var(--accent-2);
  color: var(--ink);
  border: none;
  cursor: pointer;
}
.composer button :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
