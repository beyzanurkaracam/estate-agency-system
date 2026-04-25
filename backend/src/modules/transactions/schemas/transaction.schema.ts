import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

export enum TransactionStage {
  AGREEMENT = 'agreement',
  EARNEST_MONEY = 'earnest_money',
  TITLE_DEED = 'title_deed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AgentRole {
  LISTING = 'listing',
  SELLING = 'selling',
}


@Schema({ _id: false })
export class StageHistoryEntry {
  @Prop({
    type: String,
    enum: Object.values(TransactionStage),
    required: true,
  })
  stage!: TransactionStage;

  @Prop({ required: true, default: () => new Date() })
  changedAt!: Date;

  @Prop({ trim: true })
  note?: string;
}

export const StageHistoryEntrySchema =
  SchemaFactory.createForClass(StageHistoryEntry);


@Schema({ _id: false })
export class BreakdownAgent {
  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true })
  agentId!: Types.ObjectId;

  @Prop({ required: true })
  agentName!: string; 

  @Prop({
    type: [String],
    enum: Object.values(AgentRole),
    required: true,
  })
  roles!: AgentRole[];

  @Prop({ required: true, min: 0 })
  amount!: number; // integer, in the transaction's currency minor unit

  @Prop({ required: true, min: 0, max: 100 })
  percentage!: number;
}

export const BreakdownAgentSchema =
  SchemaFactory.createForClass(BreakdownAgent);


@Schema({ _id: false })
export class FinancialBreakdown {
  @Prop({ required: true, default: () => new Date() })
  calculatedAt!: Date;

  @Prop({ required: true, min: 0 })
  agencyShare!: number; // integer, in the transaction's currency minor unit

  @Prop({ type: [BreakdownAgentSchema], required: true })
  agents!: BreakdownAgent[];

  @Prop({ required: true, min: 0 })
  totalDistributed!: number; // sanity check
}

export const FinancialBreakdownSchema =
  SchemaFactory.createForClass(FinancialBreakdown);

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction {
  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true,
  })
  listingAgent!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true,
  })
  sellingAgent!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  totalServiceFee!: number;

  @Prop({
    type: String,
    default: 'TRY',
    uppercase: true,
    trim: true,
    match: /^[A-Z]{3}$/,
  })
  currency!: string;

  @Prop({
    type: String,
    enum: Object.values(TransactionStage),
    default: TransactionStage.AGREEMENT,
    index: true,
  })
  stage!: TransactionStage;

  @Prop({
    type: [StageHistoryEntrySchema],
    default: [],
  })
  stageHistory!: StageHistoryEntry[];

  @Prop({ type: FinancialBreakdownSchema, default: null })
  financialBreakdown!: FinancialBreakdown | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ trim: true, default: null, type: String })
  cancelReason!: string | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ createdAt: -1 });

TransactionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});