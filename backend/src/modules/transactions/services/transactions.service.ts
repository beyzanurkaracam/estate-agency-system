import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AgentsService } from '../../agents/agents.service';
import { PropertiesService } from '../../properties/properties.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { AdvanceStageDto } from '../dto/advance-stage.dto';
import { CancelTransactionDto } from '../dto/cancel-transaction.dto';
import {
  Transaction,
  TransactionDocument,
  TransactionStage,
} from '../schemas/transaction.schema';
import { CommissionService } from './commission.service';
import { StageTransitionService } from './stage-transition.service';

export interface TransactionListFilters {
  stage?: TransactionStage;
  agentId?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly agentsService: AgentsService,
    private readonly propertiesService: PropertiesService,
    private readonly commissionService: CommissionService,
    private readonly stageTransitionService: StageTransitionService,
  ) {}

  async create(dto: CreateTransactionDto): Promise<TransactionDocument> {
    // Existence checks — throw 404 if any dependency missing.
    await this.propertiesService.findById(dto.property);
    const listing = await this.agentsService.findById(dto.listingAgent);
    const selling =
      dto.listingAgent === dto.sellingAgent
        ? listing
        : await this.agentsService.findById(dto.sellingAgent);

    if (!listing.active || !selling.active) {
      throw new BadRequestException(
        'Both agents must be active to start a transaction',
      );
    }

    const initialHistory = this.stageTransitionService.buildHistoryEntry(
      TransactionStage.AGREEMENT,
      'Transaction created',
    );

    const created = await this.transactionModel.create({
      property: new Types.ObjectId(dto.property),
      listingAgent: new Types.ObjectId(dto.listingAgent),
      sellingAgent: new Types.ObjectId(dto.sellingAgent),
      totalServiceFee: dto.totalServiceFee,
      stage: TransactionStage.AGREEMENT,
      stageHistory: [initialHistory],
    });

    return this.findById(created.id);
  }

  async findAll(
    filters: TransactionListFilters = {},
  ): Promise<TransactionDocument[]> {
    const query: Record<string, any> = {};
    if (filters.stage) query.stage = filters.stage;
    if (filters.agentId) {
      const agentObjectId = new Types.ObjectId(filters.agentId);
      query.$or = [
        { listingAgent: agentObjectId },
        { sellingAgent: agentObjectId },
      ];
    }

    return this.transactionModel
      .find(query)
      .populate('property')
      .populate('listingAgent', 'name email')
      .populate('sellingAgent', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findById(id)
      .populate('property')
      .populate('listingAgent', 'name email phone')
      .populate('sellingAgent', 'name email phone')
      .exec();

    if (!transaction) {
      throw new NotFoundException(`Transaction not found: ${id}`);
    }
    return transaction;
  }

  async advanceStage(
    id: string,
    dto: AdvanceStageDto,
  ): Promise<TransactionDocument> {
    const transaction = await this.findRawById(id);

    if (dto.nextStage === TransactionStage.CANCELLED) {
      throw new BadRequestException(
        'Use POST /transactions/:id/cancel to cancel a transaction',
      );
    }

    this.stageTransitionService.assertCanTransition(
      transaction.stage,
      dto.nextStage,
    );

    transaction.stage = dto.nextStage;
    transaction.stageHistory.push(
      this.stageTransitionService.buildHistoryEntry(dto.nextStage, dto.note),
    );

    if (dto.nextStage === TransactionStage.COMPLETED) {
      transaction.financialBreakdown =
        await this.buildBreakdownSnapshot(transaction);
    }

    await transaction.save();
    return this.findById(id);
  }

  async cancel(
    id: string,
    dto: CancelTransactionDto,
  ): Promise<TransactionDocument> {
    const transaction = await this.findRawById(id);

    this.stageTransitionService.assertCanTransition(
      transaction.stage,
      TransactionStage.CANCELLED,
    );

    transaction.stage = TransactionStage.CANCELLED;
    transaction.cancelledAt = new Date();
    transaction.cancelReason = dto.reason;
    transaction.stageHistory.push(
      this.stageTransitionService.buildHistoryEntry(
        TransactionStage.CANCELLED,
        dto.reason,
      ),
    );

    await transaction.save();
    return this.findById(id);
  }

  async getBreakdown(id: string): Promise<TransactionDocument['financialBreakdown']> {
    const transaction = await this.findById(id);

    if (!transaction.financialBreakdown) {
      throw new NotFoundException(
        `Breakdown not available — transaction is in stage "${transaction.stage}", not completed`,
      );
    }
    return transaction.financialBreakdown;
  }


  private async findRawById(id: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction not found: ${id}`);
    }
    return transaction;
  }

  private async buildBreakdownSnapshot(transaction: TransactionDocument) {
    const listingId = transaction.listingAgent.toString();
    const sellingId = transaction.sellingAgent.toString();

    const listing = await this.agentsService.findById(listingId);
    const selling =
      listingId === sellingId
        ? listing
        : await this.agentsService.findById(sellingId);

    const result = this.commissionService.calculate(
      transaction.totalServiceFee,
      { id: listingId, name: listing.name },
      { id: sellingId, name: selling.name },
    );

    return {
      calculatedAt: new Date(),
      agencyShare: result.agencyShare,
      agents: result.agents.map((a) => ({
        agentId: new Types.ObjectId(a.agentId),
        agentName: a.agentName,
        roles: a.roles,
        amount: a.amount,
        percentage: a.percentage,
      })),
      totalDistributed: result.totalDistributed,
    };
  }
}