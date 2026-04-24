import { defineStore } from 'pinia'
import type {
  AdvanceStageInput,
  CancelTransactionInput,
  CreateTransactionInput,
  FinancialBreakdown,
  ID,
  Transaction,
  TransactionFilters,
  TransactionStage,
} from '~/types/api'

interface State {
  items: Transaction[]
  current: Transaction | null
  loaded: boolean
  loading: boolean
  error: string | null
  filters: TransactionFilters
}

const errorMessage = (e: unknown): string => {
  const err = e as { data?: { message?: string | string[] }; message?: string }
  const msg = err.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || err.message || 'Unexpected error'
}

export const useTransactionsStore = defineStore('transactions', {
  state: (): State => ({
    items: [],
    current: null,
    loaded: false,
    loading: false,
    error: null,
    filters: {},
  }),

  getters: {
    countsByStage: (s): Record<TransactionStage, number> => {
      const acc: Record<TransactionStage, number> = {
        agreement: 0,
        earnest_money: 0,
        title_deed: 0,
        completed: 0,
        cancelled: 0,
      }
      for (const t of s.items) acc[t.stage]++
      return acc
    },

    totalCompletedFee: (s): number =>
      s.items
        .filter((t) => t.stage === 'completed')
        .reduce((sum, t) => sum + t.totalServiceFee, 0),

    totalAgencyEarnings: (s): number =>
      s.items
        .filter((t) => t.stage === 'completed' && t.financialBreakdown)
        .reduce((sum, t) => sum + (t.financialBreakdown?.agencyShare ?? 0), 0),

    /** Sum of each agent's earnings across completed transactions. */
    agentEarnings: (
      s,
    ): { agentId: string; agentName: string; total: number }[] => {
      const acc = new Map<
        string,
        { agentId: string; agentName: string; total: number }
      >()
      for (const t of s.items) {
        if (t.stage !== 'completed' || !t.financialBreakdown) continue
        for (const a of t.financialBreakdown.agents) {
          const prev = acc.get(a.agentId)
          if (prev) prev.total += a.amount
          else
            acc.set(a.agentId, {
              agentId: a.agentId,
              agentName: a.agentName,
              total: a.amount,
            })
        }
      }
      return Array.from(acc.values()).sort((x, y) => y.total - x.total)
    },
  },

  actions: {
    async fetchAll(filters: TransactionFilters = {}) {
      const api = useApi()
      this.loading = true
      this.error = null
      try {
        this.items = await api.transactions.list(filters)
        this.filters = filters
        this.loaded = true
      } catch (e) {
        this.error = errorMessage(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id: ID): Promise<Transaction> {
      const api = useApi()
      this.loading = true
      this.error = null
      try {
        this.current = await api.transactions.get(id)
        return this.current
      } catch (e) {
        this.error = errorMessage(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(input: CreateTransactionInput): Promise<Transaction> {
      const api = useApi()
      const created = await api.transactions.create(input)
      this.items = [created, ...this.items]
      this.current = created
      return created
    },

    async advanceStage(
      id: ID,
      input: AdvanceStageInput,
    ): Promise<Transaction> {
      const api = useApi()
      const updated = await api.transactions.advanceStage(id, input)
      this.replace(updated)
      return updated
    },

    async cancel(id: ID, input: CancelTransactionInput): Promise<Transaction> {
      const api = useApi()
      const updated = await api.transactions.cancel(id, input)
      this.replace(updated)
      return updated
    },

    async fetchBreakdown(id: ID): Promise<FinancialBreakdown> {
      const api = useApi()
      return api.transactions.breakdown(id)
    },

    replace(updated: Transaction) {
      this.items = this.items.map((t) => (t.id === updated.id ? updated : t))
      if (this.current?.id === updated.id) this.current = updated
    },
  },
})
