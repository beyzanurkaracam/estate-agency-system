<script setup lang="ts">
import type { TransactionStage } from '~/types/api'
import { ACTIVE_STAGE_ORDER } from '~/types/api'

const props = defineProps<{ stage: TransactionStage }>()
const { STAGE_LABEL } = useFormatters()

const currentIndex = computed(() => {
  if (props.stage === 'cancelled') return -1
  return ACTIVE_STAGE_ORDER.indexOf(props.stage)
})
</script>

<template>
  <div>
    <ol class="flex items-center gap-2 sm:gap-4">
      <li
        v-for="(s, i) in ACTIVE_STAGE_ORDER"
        :key="s"
        class="flex items-center gap-2 sm:gap-3 flex-1"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          :class="
            stage === 'cancelled'
              ? 'bg-slate-100 text-slate-400'
              : i < currentIndex
              ? 'bg-emerald-500 text-white'
              : i === currentIndex
              ? 'bg-brand-600 text-white ring-4 ring-brand-100'
              : 'bg-slate-100 text-slate-500'
          "
        >
          {{ i + 1 }}
        </div>
        <span
          class="text-xs sm:text-sm font-medium truncate"
          :class="
            stage === 'cancelled'
              ? 'text-slate-400'
              : i <= currentIndex
              ? 'text-slate-900'
              : 'text-slate-500'
          "
        >
          {{ STAGE_LABEL[s] }}
        </span>
        <div
          v-if="i < ACTIVE_STAGE_ORDER.length - 1"
          class="hidden sm:block flex-1 h-px"
          :class="
            stage !== 'cancelled' && i < currentIndex ? 'bg-emerald-400' : 'bg-slate-200'
          "
        />
      </li>
    </ol>
    <div v-if="stage === 'cancelled'" class="mt-3 text-sm text-rose-700 font-medium">
      This transaction was cancelled.
    </div>
  </div>
</template>
