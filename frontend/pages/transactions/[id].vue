<script setup lang="ts">
import type { Transaction } from '~/types/api'

const route = useRoute()
const txStore = useTransactionsStore()
const {
  formatMoney,
  formatDate,
  STAGE_LABEL,
  nextStageOf,
  isTerminal,
  agentName,
  propertyLabel,
} = useFormatters()

const id = computed(() => route.params.id as string)

await useAsyncData(`tx-${id.value}`, () => txStore.fetchOne(id.value))

const tx = computed<Transaction | null>(() => txStore.current)

const advancing = ref(false)
const cancelling = ref(false)
const showCancel = ref(false)
const cancelReason = ref('')
const advanceNote = ref('')
const actionError = ref<string | null>(null)

const nextStage = computed(() => (tx.value ? nextStageOf(tx.value.stage) : null))

const onAdvance = async () => {
  if (!tx.value || !nextStage.value) return
  advancing.value = true
  actionError.value = null
  try {
    await txStore.advanceStage(tx.value.id, {
      nextStage: nextStage.value,
      note: advanceNote.value || undefined,
    })
    advanceNote.value = ''
  } catch (e) {
    actionError.value = txStore.error ?? 'Failed to advance stage'
  } finally {
    advancing.value = false
  }
}

const onCancel = async () => {
  if (!tx.value || !cancelReason.value.trim()) return
  cancelling.value = true
  actionError.value = null
  try {
    await txStore.cancel(tx.value.id, { reason: cancelReason.value.trim() })
    showCancel.value = false
    cancelReason.value = ''
  } catch (e) {
    actionError.value = txStore.error ?? 'Failed to cancel'
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <NuxtLink to="/transactions" class="text-sm text-brand-600 hover:underline">
        ← Back to transactions
      </NuxtLink>
    </div>

    <LoadingState v-if="!tx && txStore.loading" />

    <template v-else-if="tx">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">
            {{ propertyLabel(tx.property) }}
          </h1>
          <p class="text-sm text-slate-500 font-mono">#{{ tx.id }}</p>
        </div>
        <StageBadge :stage="tx.stage" />
      </div>

      <div class="card p-5">
        <StageStepper :stage="tx.stage" />
      </div>

      <!-- Actions -->
      <div v-if="!isTerminal(tx.stage)" class="card p-5 space-y-3">
        <h2 class="font-medium text-slate-900">Advance stage</h2>
        <ErrorAlert :message="actionError" />
        <div v-if="nextStage">
          <label class="label">Note (optional)</label>
          <input
            v-model="advanceNote"
            class="input"
            placeholder="e.g. Earnest money received, receipt archived"
          />
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              class="btn-primary"
              :disabled="advancing"
              @click="onAdvance"
            >
              {{ advancing ? 'Working…' : `Advance → ${STAGE_LABEL[nextStage]}` }}
            </button>
            <button
              class="btn-danger"
              :disabled="showCancel"
              @click="showCancel = true"
            >
              Cancel transaction
            </button>
          </div>
        </div>

        <div v-if="showCancel" class="mt-3 border-t border-slate-200 pt-3 space-y-2">
          <label class="label">Cancellation reason (required)</label>
          <textarea
            v-model="cancelReason"
            class="input min-h-[80px]"
            placeholder="e.g. Buyer could not secure financing"
          />
          <div class="flex gap-2 justify-end">
            <button class="btn-secondary" @click="showCancel = false">Keep open</button>
            <button
              class="btn-danger"
              :disabled="!cancelReason.trim() || cancelling"
              @click="onCancel"
            >
              {{ cancelling ? 'Cancelling…' : 'Confirm cancel' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section class="card p-5">
          <h2 class="font-medium text-slate-900 mb-3">Parties &amp; fee</h2>
          <dl class="text-sm space-y-2">
            <div class="flex justify-between">
              <dt class="text-slate-500">Listing agent</dt>
              <dd class="font-medium">{{ agentName(tx.listingAgent) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Selling agent</dt>
              <dd class="font-medium">{{ agentName(tx.sellingAgent) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Total service fee</dt>
              <dd class="font-semibold">
                {{ formatMoney(tx.totalServiceFee, tx.currency) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Created</dt>
              <dd>{{ formatDate(tx.createdAt) }}</dd>
            </div>
            <div v-if="tx.cancelledAt" class="flex justify-between">
              <dt class="text-slate-500">Cancelled</dt>
              <dd class="text-rose-700">{{ formatDate(tx.cancelledAt) }}</dd>
            </div>
            <div v-if="tx.cancelReason" class="pt-1 text-rose-700">
              <span class="text-slate-500">Reason: </span>{{ tx.cancelReason }}
            </div>
          </dl>
        </section>

        <!-- Breakdown -->
        <section class="card p-5">
          <h2 class="font-medium text-slate-900 mb-3">Financial breakdown</h2>
          <div
            v-if="!tx.financialBreakdown"
            class="text-sm text-slate-500"
          >
            Breakdown is snapshotted when the transaction is completed.
          </div>
          <div v-else class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">Agency share (50%)</span>
              <span class="font-semibold text-emerald-700">
                {{ formatMoney(tx.financialBreakdown.agencyShare) }}
              </span>
            </div>
            <div
              v-for="a in tx.financialBreakdown.agents"
              :key="a.agentId"
              class="flex justify-between"
            >
              <span class="text-slate-700">
                {{ a.agentName }}
                <span class="text-slate-400 text-xs">
                  · {{ a.roles.join(' + ') }} · {{ a.percentage }}%
                </span>
              </span>
              <span class="font-medium">{{ formatMoney(a.amount) }}</span>
            </div>
            <div class="pt-2 border-t border-slate-200 flex justify-between">
              <span class="text-slate-500">Total distributed</span>
              <span class="font-semibold">
                {{ formatMoney(tx.financialBreakdown.totalDistributed) }}
              </span>
            </div>
            <div class="text-xs text-slate-400">
              Calculated at {{ formatDate(tx.financialBreakdown.calculatedAt) }}
            </div>
          </div>
        </section>
      </div>

      <!-- History -->
      <section class="card">
        <div class="px-5 py-3 border-b border-slate-200">
          <h2 class="font-medium text-slate-900">Stage history</h2>
        </div>
        <ol class="divide-y divide-slate-100">
          <li
            v-for="(h, i) in [...tx.stageHistory].reverse()"
            :key="i"
            class="px-5 py-3 flex items-start justify-between gap-4"
          >
            <div>
              <div class="flex items-center gap-2">
                <StageBadge :stage="h.stage" />
                <span class="text-xs text-slate-500">
                  {{ formatDate(h.changedAt) }}
                </span>
              </div>
              <div v-if="h.note" class="mt-1 text-sm text-slate-700">
                {{ h.note }}
              </div>
            </div>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>
