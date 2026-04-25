
export type ID = string

export interface Timestamps {
  createdAt: string
  updatedAt: string
}


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
  listingPrice: number 
  currency: string
  listedBy: ID | Agent
}

/**
 * UI dropdown defaults. The backend accepts any ISO 4217 code; this list is
 * just the convenience subset shown in forms. Add more as needed.
 */
export const SUPPORTED_CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP', 'JPY'] as const
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export interface CreatePropertyInput {
  address: Address
  type: PropertyType
  listingPrice: number
  listedBy: ID
  /** ISO 4217 code; defaults to 'TRY' on the server when omitted. */
  currency?: string
}

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
  /** Integer in the transaction's currency minor unit. */
  amount: number
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
  totalServiceFee: number 
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
  totalServiceFee: number
  /** ISO 4217. If omitted, the property's currency is inherited. */
  currency?: string
}

export interface AdvanceStageInput {
  nextStage: Exclude<TransactionStage, 'cancelled'>
  note?: string
}

export interface CancelTransactionInput {
  reason: string
}


export type QueryParams = Record<string, string | number | boolean | undefined>

export interface TransactionFilters extends QueryParams {
  stage?: TransactionStage
  agentId?: ID
}

export interface PropertyFilters extends QueryParams {
  city?: string
  type?: PropertyType
  listedBy?: ID
}
