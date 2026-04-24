import { defineStore } from 'pinia'
import type {
  CreatePropertyInput,
  ID,
  Property,
  PropertyFilters,
} from '~/types/api'

interface State {
  items: Property[]
  loaded: boolean
  loading: boolean
  error: string | null
  filters: PropertyFilters
}

const errorMessage = (e: unknown): string => {
  const err = e as { data?: { message?: string | string[] }; message?: string }
  const msg = err.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg || err.message || 'Unexpected error'
}

export const usePropertiesStore = defineStore('properties', {
  state: (): State => ({
    items: [],
    loaded: false,
    loading: false,
    error: null,
    filters: {},
  }),

  getters: {
    byId: (s) => (id: ID) => s.items.find((p) => p.id === id) ?? null,
  },

  actions: {
    async fetchAll(filters: PropertyFilters = {}, opts?: { force?: boolean }) {
      const api = useApi()
      const same = JSON.stringify(filters) === JSON.stringify(this.filters)
      if (this.loaded && same && !opts?.force) return

      this.loading = true
      this.error = null
      try {
        this.items = await api.properties.list(filters)
        this.filters = filters
        this.loaded = true
      } catch (e) {
        this.error = errorMessage(e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(input: CreatePropertyInput): Promise<Property> {
      const api = useApi()
      const created = await api.properties.create(input)
      this.items = [created, ...this.items]
      return created
    },

    async update(id: ID, input: CreatePropertyInput): Promise<Property> {
      const api = useApi()
      const updated = await api.properties.update(id, input)
      this.items = this.items.map((p) => (p.id === id ? updated : p))
      return updated
    },
  },
})
