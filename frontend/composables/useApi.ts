import type {
  Agent,
  AdvanceStageInput,
  CancelTransactionInput,
  CreateAgentInput,
  CreatePropertyInput,
  CreateTransactionInput,
  FinancialBreakdown,
  ID,
  Property,
  PropertyFilters,
  Transaction,
  TransactionFilters,
  UpdateAgentInput,
} from '~/types/api'

/**
 * Thin API client for the NestJS backend. All methods throw on non-2xx;
 * callers should wrap calls in stores' withLoading helper to surface errors.
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  const request = <T>(
    path: string,
    opts: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
      body?: unknown
      query?: Record<string, string | undefined>
    } = {},
  ): Promise<T> => {
    return $fetch<T>(path, {
      baseURL: base,
      method: opts.method ?? 'GET',
      body: opts.body,
      query: opts.query,
    })
  }

  return {
    // ---------- Agents ----------
    agents: {
      list: (opts?: { includeInactive?: boolean }) =>
        request<Agent[]>('/agents', {
          query: opts?.includeInactive ? { active: 'false' } : {},
        }),
      get: (id: ID) => request<Agent>(`/agents/${id}`),
      create: (body: CreateAgentInput) =>
        request<Agent>('/agents', { method: 'POST', body }),
      update: (id: ID, body: UpdateAgentInput) =>
        request<Agent>(`/agents/${id}`, { method: 'PATCH', body }),
      softDelete: (id: ID) =>
        request<Agent>(`/agents/${id}`, { method: 'DELETE' }),
    },

    // ---------- Properties ----------
    properties: {
      list: (filters: PropertyFilters = {}) =>
        request<Property[]>('/properties', { query: filters }),
      get: (id: ID) => request<Property>(`/properties/${id}`),
      create: (body: CreatePropertyInput) =>
        request<Property>('/properties', { method: 'POST', body }),
      update: (id: ID, body: CreatePropertyInput) =>
        request<Property>(`/properties/${id}`, { method: 'PATCH', body }),
    },

    // ---------- Transactions ----------
    transactions: {
      list: (filters: TransactionFilters = {}) =>
        request<Transaction[]>('/transactions', { query: filters }),
      get: (id: ID) => request<Transaction>(`/transactions/${id}`),
      create: (body: CreateTransactionInput) =>
        request<Transaction>('/transactions', { method: 'POST', body }),
      advanceStage: (id: ID, body: AdvanceStageInput) =>
        request<Transaction>(`/transactions/${id}/stage`, {
          method: 'PATCH',
          body,
        }),
      cancel: (id: ID, body: CancelTransactionInput) =>
        request<Transaction>(`/transactions/${id}/cancel`, {
          method: 'POST',
          body,
        }),
      breakdown: (id: ID) =>
        request<FinancialBreakdown>(`/transactions/${id}/breakdown`),
    },
  }
}
