// Shared types mirroring the backend API contract.
// Amounts are integer kuruş (1 TRY = 100 kuruş).

export type ID = string

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

// ---------- Agents ----------

export interface Agent extends Timestamps {
  id: ID
  name: string
  email: string
  phone?: string
  active: boolean
}

export interface CreateAgentInput {
  name: string
  email: string
  phone?: string
}

export type UpdateAgentInput = Partial<CreateAgentInput> & { active?: boolean }

// ---------- Properties ----------

export type PropertyType = 'apartment' | 'house' | 'office' | 'land'

export const PROPERTY_TYPES: PropertyType[] = [
  'apartment',
  'house',
  'office',
  'land',
]

export interface Address {
  street: string
  district: string
  city: string
  postalCode?: string
}

export interface Property extends Timestamps {
  id: ID
  address: Address
  type: PropertyType
  listingPrice: number // kuruş
  currency: string
  listedBy: ID | Agent
}

export interface CreatePropertyInput {
  address: Address
  type: PropertyType
  listingPrice: number
  listedBy: ID
}

// ---------- Transactions ----------

export type TransactionStage =
  | 'agreement'
  | 'earnest_money'
  | 'title_deed'
  | 'completed'
  | 'cancelled'

export const TRANSACTION_STAGES: TransactionStage[] = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
  'cancelled',
]

export const ACTIVE_STAGE_ORDER: TransactionStage[] = [
  'agreement',
  'earnest_money',
  'title_deed',
  'completed',
]

export type AgentRole = 'listing' | 'selling'

export interface StageHistoryEntry {
  stage: TransactionStage
  changedAt: string
  note?: string
}

export interface BreakdownAgent {
  agentId: ID
  agentName: string
  roles: AgentRole[]
  amount: number // kuruş
  percentage: number
}

export interface FinancialBreakdown {
  calculatedAt: string
  agencyShare: number
  agents: BreakdownAgent[]
  totalDistributed: number
}

export interface Transaction extends Timestamps {
  id: ID
  property: ID | Property
  listingAgent: ID | Agent
  sellingAgent: ID | Agent
  totalServiceFee: number // kuruş
  currency: string
  stage: TransactionStage
  stageHistory: StageHistoryEntry[]
  financialBreakdown: FinancialBreakdown | null
  cancelledAt: string | null
  cancelReason: string | null
}

export interface CreateTransactionInput {
  property: ID
  listingAgent: ID
  sellingAgent: ID
  totalServiceFee: number // kuruş
}

export interface AdvanceStageInput {
  nextStage: Exclude<TransactionStage, 'cancelled'>
  note?: string
}

export interface CancelTransactionInput {
  reason: string
}

// ---------- Filters ----------

export interface TransactionFilters {
  stage?: TransactionStage
  agentId?: ID
}

export interface PropertyFilters {
  city?: string
  type?: PropertyType
  listedBy?: ID
}
