<script setup lang="ts">
defineProps<{ message: string | null | undefined }>()
</script>

<template>
  <div
    v-if="message"
    class="rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm"
  >
    {{ message }}
  </div>
</template>
