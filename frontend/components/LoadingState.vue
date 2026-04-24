<script setup lang="ts">
defineProps<{ message?: string }>()
</script>

<template>
  <div class="flex items-center gap-3 text-sm text-slate-500 py-6">
    <span class="inline-block w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
    <span>{{ message ?? 'Loading…' }}</span>
  </div>
</template>
