import { defineStore } from 'pinia'
import type { Agent, CreateAgentInput, ID, UpdateAgentInput } from '~/types/api'

interface State {
  items: Agent[]
  loaded: boolean
  loading: boolean
  error: string | null
}

const errorMessage = (e: unknown): string => {
  const err = e as { data?: { message?: string | string[] }; message?: string }
  const msg = err.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || err.message || 'Unexpected error'
}

export const useAgentsStore = defineStore('agents', {
  state: (): State => ({
    items: [],
    loaded: false,
    loading: false,
    error: null,
  }),

  getters: {
    active: (s): Agent[] => s.items.filter((a) => a.active),
    byId: (s) => (id: ID) => s.items.find((a) => a.id === id) ?? null,
  },

  actions: {
    async fetchAll(opts?: { includeInactive?: boolean; force?: boolean }) {
      if (this.loaded && !opts?.force) return
      const api = useApi()
      this.loading = true
      this.error = null
      try {
        this.items = await api.agents.list({
          includeInactive: opts?.includeInactive,
        })
        this.loaded = true
      } catch (e) {
        this.error = errorMessage(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(input: CreateAgentInput): Promise<Agent> {
      const api = useApi()
      const created = await api.agents.create(input)
      this.items = [...this.items, created]
      return created
    },

    async update(id: ID, input: UpdateAgentInput): Promise<Agent> {
      const api = useApi()
      const updated = await api.agents.update(id, input)
      this.items = this.items.map((a) => (a.id === id ? updated : a))
      return updated
    },

    async softDelete(id: ID): Promise<void> {
      const api = useApi()
      const updated = await api.agents.softDelete(id)
      this.items = this.items.map((a) => (a.id === id ? updated : a))
    },
  },
})
