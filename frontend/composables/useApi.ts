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
  QueryParams,
  Transaction,
  TransactionFilters,
  UpdateAgentInput,
} from '~/types/api'


export const useApi = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  const request = <T>(
    path: string,
    opts: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
      body?: object
      query?: QueryParams
    } = {},
  ): Promise<T> => {
    return $fetch<T>(path, {
      baseURL: base,
      method: opts.method ?? 'GET',
      body: opts.body as Record<string, unknown>,
      query: opts.query,
    })
  }

  return {
    
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

    
    properties: {
      list: (filters: PropertyFilters = {}) =>
        request<Property[]>('/properties', { query: filters }),
      get: (id: ID) => request<Property>(`/properties/${id}`),
      create: (body: CreatePropertyInput) =>
        request<Property>('/properties', { method: 'POST', body }),
      update: (id: ID, body: CreatePropertyInput) =>
        request<Property>(`/properties/${id}`, { method: 'PATCH', body }),
      remove: (id: ID) =>
        request<void>(`/properties/${id}`, { method: 'DELETE' }),
    },

    
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
