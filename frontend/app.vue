<script setup lang="ts">
const route = useRoute()

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/agents', label: 'Agents' },
  { to: '/properties', label: 'Properties' },
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-slate-900">
          <span class="inline-block w-2 h-2 rounded-full bg-brand-600" />
          Estate Agency
        </NuxtLink>
        <nav class="flex gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-1.5 rounded-md text-sm transition"
            :class="
              route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <NuxtPage />
      </div>
    </main>

    <footer class="border-t border-slate-200 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        Estate Agency Transaction System
      </div>
    </footer>
  </div>
</template>
