<script setup lang="ts">
import type { CreatePropertyInput, PropertyType } from '~/types/api'
import { PROPERTY_TYPES } from '~/types/api'

const propsStore = usePropertiesStore()
const agentsStore = useAgentsStore()
const { formatMoney, formatDate, agentName } = useFormatters()

await useAsyncData('properties-list', () =>
  Promise.all([propsStore.fetchAll({}, { force: true }), agentsStore.fetchAll()]).then(
    () => true,
  ),
)

const form = reactive<CreatePropertyInput>({
  address: { street: '', district: '', city: '', postalCode: '' },
  type: 'apartment',
  listingPrice: 0,
  listedBy: '',
})

const submitting = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(
  () =>
    form.address.street &&
    form.address.district &&
    form.address.city &&
    form.listingPrice > 0 &&
    form.listedBy,
)

const onCreate = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = null
  try {
    await propsStore.create({
      ...form,
      address: { ...form.address, postalCode: form.address.postalCode || undefined },
    })
    form.address.street = ''
    form.address.district = ''
    form.address.city = ''
    form.address.postalCode = ''
    form.listingPrice = 0
    form.listedBy = ''
  } catch (e) {
    const err = e as { data?: { message?: string | string[] } }
    const m = err.data?.message
    error.value = Array.isArray(m) ? m.join(', ') : m || 'Failed to create property'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Properties</h1>
      <p class="text-sm text-slate-500">Listings available for transactions.</p>
    </div>

    <section class="card p-5">
      <h2 class="font-medium text-slate-900 mb-3">New property</h2>
      <ErrorAlert :message="error" />
      <form class="grid grid-cols-1 sm:grid-cols-3 gap-3" @submit.prevent="onCreate">
        <div>
          <label class="label">Street</label>
          <input v-model="form.address.street" class="input" required />
        </div>
        <div>
          <label class="label">District</label>
          <input v-model="form.address.district" class="input" required />
        </div>
        <div>
          <label class="label">City</label>
          <input v-model="form.address.city" class="input" required />
        </div>
        <div>
          <label class="label">Postal code (optional)</label>
          <input v-model="form.address.postalCode" class="input" />
        </div>
        <div>
          <label class="label">Type</label>
          <select v-model="form.type" class="input">
            <option v-for="t in PROPERTY_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label">Listing price</label>
          <MoneyInput v-model="form.listingPrice" required />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Listed by</label>
          <select v-model="form.listedBy" class="input" required>
            <option value="">Select an agent…</option>
            <option v-for="a in agentsStore.active" :key="a.id" :value="a.id">
              {{ a.name }} · {{ a.email }}
            </option>
          </select>
        </div>
        <div class="sm:col-span-1 flex items-end">
          <button
            class="btn-primary w-full"
            :disabled="!canSubmit || submitting"
            type="submit"
          >
            {{ submitting ? 'Saving…' : 'Add property' }}
          </button>
        </div>
      </form>
    </section>

    <ErrorAlert :message="propsStore.error" />
    <LoadingState v-if="propsStore.loading && !propsStore.items.length" />
    <EmptyState
      v-else-if="!propsStore.items.length"
      title="No properties yet"
      hint="Add a property above to start creating transactions."
    />
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="text-left px-4 py-2">Address</th>
            <th class="text-left px-4 py-2">Type</th>
            <th class="text-right px-4 py-2">Listing price</th>
            <th class="text-left px-4 py-2">Listed by</th>
            <th class="text-left px-4 py-2">Added</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="p in propsStore.items" :key="p.id">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ p.address.street }}</div>
              <div class="text-xs text-slate-500">
                {{ p.address.district }}, {{ p.address.city }}
                <span v-if="p.address.postalCode"> · {{ p.address.postalCode }}</span>
              </div>
            </td>
            <td class="px-4 py-3 capitalize text-slate-600">{{ p.type }}</td>
            <td class="px-4 py-3 text-right font-medium">
              {{ formatMoney(p.listingPrice, p.currency) }}
            </td>
            <td class="px-4 py-3 text-slate-600">{{ agentName(p.listedBy) }}</td>
            <td class="px-4 py-3 text-slate-500">{{ formatDate(p.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
