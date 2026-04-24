<script setup lang="ts">
import type { CreateAgentInput } from '~/types/api'

const agentsStore = useAgentsStore()
const { formatDate } = useFormatters()

const includeInactive = ref(false)

await useAsyncData('agents-list', () => agentsStore.fetchAll({ force: true }))

watch(includeInactive, (v) =>
  agentsStore.fetchAll({ includeInactive: v, force: true }),
)

const form = reactive<CreateAgentInput>({ name: '', email: '', phone: '' })
const submitting = ref(false)
const error = ref<string | null>(null)

const onCreate = async () => {
  submitting.value = true
  error.value = null
  try {
    await agentsStore.create({ ...form, phone: form.phone || undefined })
    Object.assign(form, { name: '', email: '', phone: '' })
  } catch (e) {
    const err = e as { data?: { message?: string | string[] } }
    const m = err.data?.message
    error.value = Array.isArray(m) ? m.join(', ') : m || 'Failed to create agent'
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (id: string, active: boolean) => {
  if (active) await agentsStore.softDelete(id)
  else await agentsStore.update(id, { active: true })
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Agents</h1>
      <p class="text-sm text-slate-500">
        Manage the agents who list properties and close deals.
      </p>
    </div>

    <section class="card p-5">
      <h2 class="font-medium text-slate-900 mb-3">New agent</h2>
      <ErrorAlert :message="error" />
      <form class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" @submit.prevent="onCreate">
        <div class="sm:col-span-1">
          <label class="label">Name</label>
          <input v-model="form.name" class="input" required minlength="2" />
        </div>
        <div class="sm:col-span-1">
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" required />
        </div>
        <div class="sm:col-span-1">
          <label class="label">Phone (optional)</label>
          <input v-model="form.phone" class="input" />
        </div>
        <button class="btn-primary" :disabled="submitting" type="submit">
          {{ submitting ? 'Saving…' : 'Add agent' }}
        </button>
      </form>
    </section>

    <div class="flex items-center gap-2">
      <input id="inactive" v-model="includeInactive" type="checkbox" />
      <label for="inactive" class="text-sm text-slate-700">Show inactive agents</label>
    </div>

    <ErrorAlert :message="agentsStore.error" />
    <LoadingState v-if="agentsStore.loading && !agentsStore.items.length" />
    <EmptyState
      v-else-if="!agentsStore.items.length"
      title="No agents yet"
      hint="Create one above to start building transactions."
    />
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="text-left px-4 py-2">Name</th>
            <th class="text-left px-4 py-2">Email</th>
            <th class="text-left px-4 py-2">Phone</th>
            <th class="text-left px-4 py-2">Status</th>
            <th class="text-left px-4 py-2">Joined</th>
            <th class="text-right px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="a in agentsStore.items" :key="a.id">
            <td class="px-4 py-3 font-medium text-slate-900">{{ a.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ a.email }}</td>
            <td class="px-4 py-3 text-slate-600">{{ a.phone ?? '—' }}</td>
            <td class="px-4 py-3">
              <span
                class="badge"
                :class="
                  a.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                "
              >
                {{ a.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500">{{ formatDate(a.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <button class="btn-secondary" @click="toggleActive(a.id, a.active)">
                {{ a.active ? 'Deactivate' : 'Reactivate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
