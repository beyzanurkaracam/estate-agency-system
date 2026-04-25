import type {
  Agent,
  Property,
  Transaction,
  TransactionStage,
} from '~/types/api'

export const useFormatters = () => {
  const { minorUnitFactor, minorUnitDecimals } = useCurrency()

  /**
   * Render an integer amount stored in the currency's minor unit
   * (kuruş for TRY, cents for EUR/USD, yen for JPY, …).
   */
  const formatMoney = (minor: number, currency = 'TRY'): string => {
    const code = currency || 'TRY'
    const value = (minor ?? 0) / minorUnitFactor(code)
    const decimals = minorUnitDecimals(code)
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const formatDate = (iso: string | Date): string => {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  }

  const STAGE_LABEL: Record<TransactionStage, string> = {
    agreement: 'Agreement',
    earnest_money: 'Earnest Money',
    title_deed: 'Title Deed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  const STAGE_COLOR: Record<TransactionStage, string> = {
    agreement: 'bg-slate-100 text-slate-700',
    earnest_money: 'bg-amber-100 text-amber-800',
    title_deed: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-rose-100 text-rose-800',
  }

  const nextStageOf = (
    stage: TransactionStage,
  ): Exclude<TransactionStage, 'cancelled'> | null => {
    switch (stage) {
      case 'agreement':
        return 'earnest_money'
      case 'earnest_money':
        return 'title_deed'
      case 'title_deed':
        return 'completed'
      default:
        return null
    }
  }

  const isTerminal = (stage: TransactionStage): boolean =>
    stage === 'completed' || stage === 'cancelled'

  /** Safely resolve a populated-or-id reference. */
  const resolveId = <T extends { id: string }>(ref: string | T): string =>
    typeof ref === 'string' ? ref : ref.id

  const agentName = (ref: string | Agent): string =>
    typeof ref === 'string' ? ref : ref.name

  const propertyLabel = (ref: string | Property): string => {
    if (typeof ref === 'string') return ref
    const { street, district, city } = ref.address
    return `${street}, ${district}, ${city}`
  }

  const transactionSummary = (t: Transaction): string => {
    const prop = propertyLabel(t.property)
    return `${prop} — ${formatMoney(t.totalServiceFee, t.currency)}`
  }

  return {
    formatMoney,
    formatDate,
    STAGE_LABEL,
    STAGE_COLOR,
    nextStageOf,
    isTerminal,
    resolveId,
    agentName,
    propertyLabel,
    transactionSummary,
  }
}
