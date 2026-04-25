<script setup lang="ts">
import type { CreateTransactionInput } from '~/types/api'
import { SUPPORTED_CURRENCIES } from '~/types/api'

const agentsStore = useAgentsStore()
const propsStore = usePropertiesStore()
const txStore = useTransactionsStore()
const { formatMoney, propertyLabel } = useFormatters()

await useAsyncData('new-tx-refs', () =>
  Promise.all([agentsStore.fetchAll(), propsStore.fetchAll()]).then(() => true),
)

const form = reactive<CreateTransactionInput>({
  property: '',
  listingAgent: '',
  sellingAgent: '',
  totalServiceFee: 0,
  currency: 'TRY',
})

const sameAgent = ref(false)
watch(sameAgent, (v) => {
  if (v) form.sellingAgent = form.listingAgent
})
watch(
  () => form.listingAgent,
  (v) => {
    if (sameAgent.value) form.sellingAgent = v
  },
)

const submitting = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(
  () =>
    !!form.property &&
    !!form.listingAgent &&
    !!form.sellingAgent &&
    form.totalServiceFee > 0,
)

const onSubmit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = null
  try {
    const created = await txStore.create({ ...form })
    await navigateTo(`/transactions/${created.id}`)
  } catch (e) {
    error.value = txStore.error ?? 'Failed to create transaction'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-4">
    <div>
      <NuxtLink to="/transactions" class="text-sm text-brand-600 hover:underline">
        ← Back to transactions
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-slate-900 mt-1">New transaction</h1>
      <p class="text-sm text-slate-500">
        Starts in <code>agreement</code> stage.
      </p>
    </div>

    <ErrorAlert :message="error" />

    <form class="card p-5 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="property">Property</label>
        <select id="property" v-model="form.property" class="input" required>
          <option value="">Select a property…</option>
          <option v-for="p in propsStore.items" :key="p.id" :value="p.id">
            {{ propertyLabel(p) }} — {{ formatMoney(p.listingPrice, p.currency) }}
          </option>
        </select>
      </div>

      <div>
        <label class="label">Listing agent</label>
        <select v-model="form.listingAgent" class="input" required>
          <option value="">Select…</option>
          <option v-for="a in agentsStore.active" :key="a.id" :value="a.id">
            {{ a.name }} · {{ a.email }}
          </option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input id="same" v-model="sameAgent" type="checkbox" />
        <label for="same" class="text-sm text-slate-700">
          Same agent handles both sides (listing + selling)
        </label>
      </div>

      <div v-if="!sameAgent">
        <label class="label">Selling agent</label>
        <select v-model="form.sellingAgent" class="input" required>
          <option value="">Select…</option>
          <option v-for="a in agentsStore.active" :key="a.id" :value="a.id">
            {{ a.name }} · {{ a.email }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Currency</label>
          <select v-model="form.currency" class="input">
            <option v-for="c in SUPPORTED_CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="label">Total service fee</label>
          <MoneyInput v-model="form.totalServiceFee" :currency="form.currency" required />
        </div>
      </div>
      <p class="text-xs text-slate-500 -mt-2">
        50% goes to the agency, 50% is split between agents per policy.
      </p>

      <div class="flex justify-end gap-2 pt-2">
        <NuxtLink class="btn-secondary" to="/transactions">Cancel</NuxtLink>
        <button class="btn-primary" :disabled="!canSubmit || submitting" type="submit">
          {{ submitting ? 'Creating…' : 'Create transaction' }}
        </button>
      </div>
    </form>
  </div>
</template>
