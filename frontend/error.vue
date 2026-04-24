<script setup lang="ts">
defineProps<{ error: { statusCode: number; message: string } }>()
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="card p-8 max-w-md w-full text-center">
      <div class="text-5xl font-bold text-brand-600 mb-2">{{ error.statusCode }}</div>
      <p class="text-slate-700 mb-6">{{ error.message }}</p>
      <button class="btn-primary mx-auto" @click="handleError">Go home</button>
    </div>
  </div>
</template>
