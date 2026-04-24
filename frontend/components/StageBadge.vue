<script setup lang="ts">
import type { TransactionStage } from '~/types/api'

defineProps<{ stage: TransactionStage }>()
const { STAGE_LABEL, STAGE_COLOR } = useFormatters()
</script>

<template>
  <span class="badge" :class="STAGE_COLOR[stage]">{{ STAGE_LABEL[stage] }}</span>
</template>
