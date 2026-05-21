<script setup>
// A strip of gaffer tape with a slight rotation. Decorative label.
</script>

<template>
  <span class="tape"><slot /></span>
</template>

<style scoped>
.tape {
  display: inline-block;
  background: var(--accent);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 16px;
  padding: 1px 10px;
  transform: rotate(-2deg);
  border: 1px solid var(--border);
}
</style>
