<script setup lang="ts">
import type { TransactionStage } from '~/types/api'
import { TRANSACTION_STAGES } from '~/types/api'

const txStore = useTransactionsStore()
const agentsStore = useAgentsStore()
const { formatMoney, formatDate, transactionSummary, agentName, STAGE_LABEL } = useFormatters()

const stageFilter = ref<TransactionStage | ''>('')
const agentFilter = ref<string>('')

const applyFilters = () =>
  txStore.fetchAll({
    stage: stageFilter.value || undefined,
    agentId: agentFilter.value || undefined,
  })

await useAsyncData('transactions-list', async () => {
  await Promise.all([agentsStore.fetchAll(), applyFilters()])
  return true
})

watch([stageFilter, agentFilter], () => applyFilters())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Transactions</h1>
        <p class="text-sm text-slate-500">
          Track every agreement from creation to completion.
        </p>
      </div>
      <NuxtLink to="/transactions/new" class="btn-primary">
        + New transaction
      </NuxtLink>
    </div>

    <div class="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="label">Stage</label>
        <select v-model="stageFilter" class="input min-w-[160px]">
          <option value="">All stages</option>
          <option v-for="s in TRANSACTION_STAGES" :key="s" :value="s">{{ STAGE_LABEL[s] }}</option>
        </select>
      </div>
      <div>
        <label class="label">Agent</label>
        <select v-model="agentFilter" class="input min-w-[200px]">
          <option value="">Any agent</option>
          <option v-for="a in agentsStore.items" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </div>
      <button
        class="btn-secondary"
        @click="() => { stageFilter = ''; agentFilter = '' }"
      >
        Clear
      </button>
    </div>

    <ErrorAlert :message="txStore.error" />

    <LoadingState v-if="txStore.loading && !txStore.items.length" />
    <EmptyState
      v-else-if="!txStore.items.length"
      title="No transactions match"
      hint="Try clearing filters or creating a new one."
    />
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="text-left px-4 py-2">Property</th>
            <th class="text-left px-4 py-2">Agents</th>
            <th class="text-right px-4 py-2">Fee</th>
            <th class="text-left px-4 py-2">Stage</th>
            <th class="text-left px-4 py-2">Updated</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="t in txStore.items"
            :key="t.id"
            class="hover:bg-slate-50 cursor-pointer"
            @click="navigateTo(`/transactions/${t.id}`)"
          >
            <td class="px-4 py-3 max-w-[320px] truncate">
              {{ transactionSummary(t) }}
            </td>
            <td class="px-4 py-3 text-slate-600">
              {{ agentName(t.listingAgent) }}
              <span v-if="agentName(t.listingAgent) !== agentName(t.sellingAgent)">
                · {{ agentName(t.sellingAgent) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right font-medium">
              {{ formatMoney(t.totalServiceFee) }}
            </td>
            <td class="px-4 py-3"><StageBadge :stage="t.stage" /></td>
            <td class="px-4 py-3 text-slate-500">{{ formatDate(t.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
