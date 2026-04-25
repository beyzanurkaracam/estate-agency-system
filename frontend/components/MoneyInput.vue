<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  /** ISO 4217 code (e.g. 'TRY', 'EUR', 'JPY'). Defaults to TRY. */
  currency?: string
  placeholder?: string
  required?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void
}>()

const { symbolFor, minorUnitDecimals, minorUnitFactor, fromMinorUnits } =
  useCurrency()

const symbol = computed(() => symbolFor(props.currency))
const decimals = computed(() => minorUnitDecimals(props.currency))
const step = computed(() =>
  decimals.value === 0 ? '1' : `0.${'0'.repeat(decimals.value - 1)}1`,
)
const placeholder = computed(
  () => props.placeholder ?? (decimals.value === 0 ? '0' : `0.${'0'.repeat(decimals.value)}`),
)

const display = ref<string>(fromMinorUnits(props.modelValue, props.currency))

watch(
  () => [props.modelValue, props.currency] as const,
  ([v]) => {
    const next = fromMinorUnits(v, props.currency)
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
  emit('update:modelValue', Math.round(num * minorUnitFactor(props.currency)))
}
</script>

<template>
  <div class="relative">
    <input
      :value="display"
      type="number"
      inputmode="decimal"
      :step="step"
      min="0"
      :placeholder="placeholder"
      :required="required"
      class="input pr-12"
      @input="onInput"
    />
    <span class="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 font-medium">
      {{ symbol }}
    </span>
  </div>
</template>
