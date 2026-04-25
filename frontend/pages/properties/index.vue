<script setup lang="ts">
import type { CreatePropertyInput, Property, PropertyType } from '~/types/api'
import { PROPERTY_TYPES, SUPPORTED_CURRENCIES } from '~/types/api'

const propsStore = usePropertiesStore()
const agentsStore = useAgentsStore()
const { formatMoney, formatDate, agentName } = useFormatters()

await useAsyncData('properties-list', () =>
  Promise.all([propsStore.fetchAll({}, { force: true }), agentsStore.fetchAll()]).then(
    () => true,
  ),
)

// ── Create form ──────────────────────────────────────────────────────────────
const form = reactive<CreatePropertyInput>({
  address: { street: '', district: '', city: '', postalCode: '' },
  type: 'apartment',
  listingPrice: 0,
  listedBy: '',
  currency: 'TRY',
})

const submitting = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(
  () =>
    form.address.street &&
    form.address.district &&
    form.address.city &&
    form.listingPrice > 0 &&
    form.listedBy,
)

const onCreate = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = null
  try {
    await propsStore.create({
      ...form,
      address: { ...form.address, postalCode: form.address.postalCode || undefined },
    })
    form.address.street = ''
    form.address.district = ''
    form.address.city = ''
    form.address.postalCode = ''
    form.listingPrice = 0
    form.listedBy = ''
  } catch (e) {
    const err = e as { data?: { message?: string | string[] } }
    const m = err.data?.message
    error.value = Array.isArray(m) ? m.join(', ') : m || 'Failed to create property'
  } finally {
    submitting.value = false
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editTarget = ref<Property | null>(null)
const editForm = reactive<CreatePropertyInput>({
  address: { street: '', district: '', city: '', postalCode: '' },
  type: 'apartment',
  listingPrice: 0,
  listedBy: '',
})
const editSubmitting = ref(false)
const editError = ref<string | null>(null)

const openEdit = (p: Property) => {
  editTarget.value = p
  editForm.address.street = p.address.street
  editForm.address.district = p.address.district
  editForm.address.city = p.address.city
  editForm.address.postalCode = p.address.postalCode ?? ''
  editForm.type = p.type as PropertyType
  editForm.listingPrice = p.listingPrice
  editForm.listedBy = typeof p.listedBy === 'string' ? p.listedBy : p.listedBy.id
  editError.value = null
}

const closeEdit = () => {
  editTarget.value = null
}

const canEditSubmit = computed(
  () =>
    editForm.address.street &&
    editForm.address.district &&
    editForm.address.city &&
    editForm.listingPrice > 0 &&
    editForm.listedBy,
)

const onEditSubmit = async () => {
  if (!editTarget.value || !canEditSubmit.value) return
  editSubmitting.value = true
  editError.value = null
  try {
    await propsStore.update(editTarget.value.id, {
      ...editForm,
      address: { ...editForm.address, postalCode: editForm.address.postalCode || undefined },
    })
    closeEdit()
  } catch (e) {
    const err = e as { data?: { message?: string | string[] } }
    const m = err.data?.message
    editError.value = Array.isArray(m) ? m.join(', ') : m || 'Failed to update property'
  } finally {
    editSubmitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteTarget = ref<Property | null>(null)
const deleteSubmitting = ref(false)

const onDeleteConfirm = async () => {
  if (!deleteTarget.value) return
  deleteSubmitting.value = true
  try {
    await propsStore.remove(deleteTarget.value.id)
    deleteTarget.value = null
  } finally {
    deleteSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Properties</h1>
      <p class="text-sm text-slate-500">Listings available for transactions.</p>
    </div>

    <!-- Create form -->
    <section class="card p-5">
      <h2 class="font-medium text-slate-900 mb-3">New property</h2>
      <ErrorAlert :message="error" />
      <form class="grid grid-cols-1 sm:grid-cols-3 gap-3" @submit.prevent="onCreate">
        <div>
          <label class="label">Street</label>
          <input v-model="form.address.street" class="input" required />
        </div>
        <div>
          <label class="label">District</label>
          <input v-model="form.address.district" class="input" required />
        </div>
        <div>
          <label class="label">City</label>
          <input v-model="form.address.city" class="input" required />
        </div>
        <div>
          <label class="label">Postal code (optional)</label>
          <input v-model="form.address.postalCode" class="input" />
        </div>
        <div>
          <label class="label">Type</label>
          <select v-model="form.type" class="input">
            <option v-for="t in PROPERTY_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label">Currency</label>
          <select v-model="form.currency" class="input">
            <option v-for="c in SUPPORTED_CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="label">Listing price</label>
          <MoneyInput v-model="form.listingPrice" :currency="form.currency" required />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Listed by</label>
          <select v-model="form.listedBy" class="input" required>
            <option value="">Select an agent…</option>
            <option v-for="a in agentsStore.active" :key="a.id" :value="a.id">
              {{ a.name }} · {{ a.email }}
            </option>
          </select>
        </div>
        <div class="sm:col-span-1 flex items-end">
          <button
            class="btn-primary w-full"
            :disabled="!canSubmit || submitting"
            type="submit"
          >
            {{ submitting ? 'Saving…' : 'Add property' }}
          </button>
        </div>
      </form>
    </section>

    <ErrorAlert :message="propsStore.error" />
    <LoadingState v-if="propsStore.loading && !propsStore.items.length" />
    <EmptyState
      v-else-if="!propsStore.items.length"
      title="No properties yet"
      hint="Add a property above to start creating transactions."
    />
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="text-left px-4 py-2">Address</th>
            <th class="text-left px-4 py-2">Type</th>
            <th class="text-right px-4 py-2">Listing price</th>
            <th class="text-left px-4 py-2">Listed by</th>
            <th class="text-left px-4 py-2">Added</th>
            <th class="px-4 py-2" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="p in propsStore.items" :key="p.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ p.address.street }}</div>
              <div class="text-xs text-slate-500">
                {{ p.address.district }}, {{ p.address.city }}
                <span v-if="p.address.postalCode"> · {{ p.address.postalCode }}</span>
              </div>
            </td>
            <td class="px-4 py-3 capitalize text-slate-600">{{ p.type }}</td>
            <td class="px-4 py-3 text-right font-medium">
              {{ formatMoney(p.listingPrice, p.currency) }}
            </td>
            <td class="px-4 py-3 text-slate-600">{{ agentName(p.listedBy) }}</td>
            <td class="px-4 py-3 text-slate-500">{{ formatDate(p.createdAt) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button
                class="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-3"
                @click="openEdit(p)"
              >
                Edit
              </button>
              <button
                class="text-xs text-red-500 hover:text-red-700 font-medium"
                @click="deleteTarget = p"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div
        v-if="editTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeEdit"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
          <h2 class="font-semibold text-slate-900 text-lg mb-4">Edit property</h2>
          <ErrorAlert :message="editError" />
          <form class="grid grid-cols-1 sm:grid-cols-2 gap-3" @submit.prevent="onEditSubmit">
            <div>
              <label class="label">Street</label>
              <input v-model="editForm.address.street" class="input" required />
            </div>
            <div>
              <label class="label">District</label>
              <input v-model="editForm.address.district" class="input" required />
            </div>
            <div>
              <label class="label">City</label>
              <input v-model="editForm.address.city" class="input" required />
            </div>
            <div>
              <label class="label">Postal code (optional)</label>
              <input v-model="editForm.address.postalCode" class="input" />
            </div>
            <div>
              <label class="label">Type</label>
              <select v-model="editForm.type" class="input">
                <option v-for="t in PROPERTY_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="label">Listing price</label>
              <MoneyInput
                v-model="editForm.listingPrice"
                :currency="editTarget?.currency"
                required
              />
            </div>
            <div class="sm:col-span-2">
              <label class="label">Listed by</label>
              <select v-model="editForm.listedBy" class="input" required>
                <option value="">Select an agent…</option>
                <option v-for="a in agentsStore.active" :key="a.id" :value="a.id">
                  {{ a.name }} · {{ a.email }}
                </option>
              </select>
            </div>
            <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" @click="closeEdit">Cancel</button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="!canEditSubmit || editSubmitting"
              >
                {{ editSubmitting ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="deleteTarget = null"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <h2 class="font-semibold text-slate-900 text-lg mb-2">Delete property?</h2>
          <p class="text-sm text-slate-600 mb-5">
            <span class="font-medium">{{ deleteTarget.address.street }}</span>,
            {{ deleteTarget.address.district }}, {{ deleteTarget.address.city }}
            will be permanently removed.
          </p>
          <div class="flex justify-end gap-2">
            <button class="btn-secondary" @click="deleteTarget = null">Cancel</button>
            <button
              class="btn-danger"
              :disabled="deleteSubmitting"
              @click="onDeleteConfirm"
            >
              {{ deleteSubmitting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
