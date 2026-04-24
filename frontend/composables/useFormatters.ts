import type {
  Agent,
  Property,
  Transaction,
  TransactionStage,
} from '~/types/api'

export const useFormatters = () => {
  /** Kuruş → human-readable TRY ("₺50.000,00"). */
  const formatMoney = (kurus: number, currency = 'TRY'): string => {
    const value = kurus / 100
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
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

  /** Next stage in the happy-path progression, or null if terminal. */
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
