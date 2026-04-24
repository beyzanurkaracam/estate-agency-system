<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
</script>

<template>
  <div class="card p-8 text-center">
    <div class="text-slate-700 font-medium">{{ title }}</div>
    <div v-if="hint" class="text-sm text-slate-500 mt-1">{{ hint }}</div>
    <div class="mt-4"><slot /></div>
  </div>
</template>
