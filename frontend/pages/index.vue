<script setup lang="ts">
import { ACTIVE_STAGE_ORDER } from '~/types/api'

const txStore = useTransactionsStore()
const { formatMoney, formatDate, STAGE_LABEL, STAGE_COLOR, transactionSummary } =
  useFormatters()

await useAsyncData('dashboard-tx', () => txStore.fetchAll())

const recent = computed(() => txStore.items.slice(0, 5))
const stageCounts = computed(() => txStore.countsByStage)
const agentEarnings = computed(() => txStore.agentEarnings.slice(0, 5))
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p class="text-sm text-slate-500">
        Overview of transaction pipeline and commission distribution.
      </p>
    </div>

    <ErrorAlert :message="txStore.error" />

    <!-- Stage counts -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div
        v-for="stage in [...ACTIVE_STAGE_ORDER, 'cancelled' as const]"
        :key="stage"
        class="card p-4"
      >
        <div class="text-xs uppercase tracking-wide text-slate-500">
          {{ STAGE_LABEL[stage] }}
        </div>
        <div class="mt-1 text-2xl font-semibold text-slate-900">
          {{ stageCounts[stage] }}
        </div>
        <span class="badge mt-2" :class="STAGE_COLOR[stage]">{{
          STAGE_LABEL[stage]
        }}</span>
      </div>
    </div>

    <!-- Totals -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card p-5">
        <div class="text-xs uppercase tracking-wide text-slate-500">
          Completed volume (service fees)
        </div>
        <div class="mt-1 text-2xl font-semibold text-slate-900">
          {{ formatMoney(txStore.totalCompletedFee) }}
        </div>
      </div>
      <div class="card p-5">
        <div class="text-xs uppercase tracking-wide text-slate-500">
          Agency earnings
        </div>
        <div class="mt-1 text-2xl font-semibold text-emerald-700">
          {{ formatMoney(txStore.totalAgencyEarnings) }}
        </div>
      </div>
      <div class="card p-5">
        <div class="text-xs uppercase tracking-wide text-slate-500">
          Completed transactions
        </div>
        <div class="mt-1 text-2xl font-semibold text-slate-900">
          {{ stageCounts.completed }}
        </div>
      </div>
    </div>

    <!-- Two columns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="card">
        <div class="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 class="font-medium text-slate-900">Recent transactions</h2>
          <NuxtLink to="/transactions" class="text-sm text-brand-600 hover:underline">
            View all →
          </NuxtLink>
        </div>
        <LoadingState v-if="txStore.loading && !txStore.loaded" />
        <EmptyState
          v-else-if="!recent.length"
          title="No transactions yet"
          hint="Create one to get started."
        >
          <NuxtLink to="/transactions/new" class="btn-primary">New transaction</NuxtLink>
        </EmptyState>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="t in recent" :key="t.id" class="px-5 py-3">
            <NuxtLink
              :to="`/transactions/${t.id}`"
              class="flex items-center justify-between gap-3 hover:bg-slate-50 -mx-5 px-5 py-1 rounded"
            >
              <div class="min-w-0">
                <div class="text-sm text-slate-900 truncate">
                  {{ transactionSummary(t) }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ formatDate(t.updatedAt) }}
                </div>
              </div>
              <StageBadge :stage="t.stage" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="card">
        <div class="px-5 py-3 border-b border-slate-200">
          <h2 class="font-medium text-slate-900">Top earning agents</h2>
          <p class="text-xs text-slate-500">Across completed transactions</p>
        </div>
        <EmptyState
          v-if="!agentEarnings.length"
          title="No completed transactions yet"
          hint="Commission earnings appear once transactions reach “completed”."
        />
        <ul v-else class="divide-y divide-slate-100">
          <li
            v-for="(a, i) in agentEarnings"
            :key="a.agentId"
            class="px-5 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span
                class="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs flex items-center justify-center font-semibold"
              >
                {{ i + 1 }}
              </span>
              <span class="text-sm text-slate-900">{{ a.agentName }}</span>
            </div>
            <span class="text-sm font-medium text-emerald-700">
              {{ formatMoney(a.total) }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
