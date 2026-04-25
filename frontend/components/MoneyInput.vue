<script setup lang="ts">
import type { SupportedCurrency } from '~/types/api'

const props = defineProps<{
  modelValue: number
  currency?: SupportedCurrency
  placeholder?: string
  required?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void
}>()

const SYMBOL: Record<SupportedCurrency, string> = { TRY: '₺', GBP: '£' }
const symbol = computed(() => SYMBOL[props.currency ?? 'TRY'])

const display = ref<string>(
  props.modelValue ? (props.modelValue / 100).toString() : '',
)

watch(
  () => props.modelValue,
  (v) => {
    const next = v ? (v / 100).toString() : ''
    if (next !== display.value) display.value = next
  },
)

const onInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value.replace(',', '.')
  display.value = raw
  const num = Number(raw)
  if (!raw || Number.isNaN(num)) {
    emit('update:modelValue', 0)
    return
  }
  emit('update:modelValue', Math.round(num * 100))
}
</script>

<template>
  <div class="relative">
    <input
      :value="display"
      type="number"
      inputmode="decimal"
      step="0.01"
      min="0"
      :placeholder="placeholder ?? '0.00'"
      :required="required"
      class="input pr-12"
      @input="onInput"
    />
    <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 font-medium">
      {{ symbol }}
    </span>
  </div>
</template>
