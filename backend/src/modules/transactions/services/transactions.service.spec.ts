// src/modules/transactions/services/transactions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AgentsService } from '../../agents/agents.service';
import { PropertiesService } from '../../properties/properties.service';
import {
  Transaction,
  TransactionStage,
} from '../schemas/transaction.schema';
import { CommissionService } from './commission.service';
import { StageTransitionService } from './stage-transition.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let agentsService: { findById: jest.Mock };
  let propertiesService: { findById: jest.Mock };

  const makeSaveableDoc = (overrides: Partial<any> = {}) => ({
    id: 'tx-1',
    stage: TransactionStage.AGREEMENT,
    stageHistory: [],
    totalServiceFee: 1_000_000,
    listingAgent: new Types.ObjectId(),
    sellingAgent: new Types.ObjectId(),
    financialBreakdown: null as any, // explicitly typed to avoid null issues
    cancelledAt: null,
    cancelReason: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    agentsService = { findById: jest.fn() };
    propertiesService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        CommissionService,
        StageTransitionService,
        { provide: AgentsService, useValue: agentsService },
        { provide: PropertiesService, useValue: propertiesService },
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            findById: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('advanceStage', () => {
    it('writes a breakdown snapshot when advancing to completed', async () => {
      const aliceId = new Types.ObjectId();
      const bobId = new Types.ObjectId();
      const doc = makeSaveableDoc({
        stage: TransactionStage.TITLE_DEED,
        listingAgent: aliceId,
        sellingAgent: bobId,
        totalServiceFee: 1_000_000,
      });

      // Mock private method
      (service as any).findRawById = jest.fn().mockResolvedValue(doc);
      service.findById = jest.fn().mockResolvedValue(doc as any);

      agentsService.findById.mockImplementation(async (id: string) => {
        if (id === aliceId.toString()) return { name: 'Alice' };
        if (id === bobId.toString()) return { name: 'Bob' };
        throw new NotFoundException();
      });

      await service.advanceStage('tx-1', {
        nextStage: TransactionStage.COMPLETED,
      });

      expect(doc.financialBreakdown).not.toBeNull();
      expect(doc.financialBreakdown!.agencyShare).toBe(500_000);
      expect(doc.financialBreakdown!.agents).toHaveLength(2);
      expect(doc.save).toHaveBeenCalled();
    });

    it('rejects advancing to cancelled via advanceStage endpoint', async () => {
      const doc = makeSaveableDoc({ stage: TransactionStage.AGREEMENT });
      (service as any).findRawById = jest.fn().mockResolvedValue(doc);

      await expect(
        service.advanceStage('tx-1', {
          nextStage: TransactionStage.CANCELLED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid transitions', async () => {
      const doc = makeSaveableDoc({ stage: TransactionStage.AGREEMENT });
      (service as any).findRawById = jest.fn().mockResolvedValue(doc);

      await expect(
        service.advanceStage('tx-1', {
          nextStage: TransactionStage.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('sets cancelledAt and cancelReason, does not create a breakdown', async () => {
      const doc = makeSaveableDoc({ stage: TransactionStage.EARNEST_MONEY });
      (service as any).findRawById = jest.fn().mockResolvedValue(doc);
      service.findById = jest.fn().mockResolvedValue(doc as any);

      await service.cancel('tx-1', { reason: 'Buyer backed out' });

      expect(doc.stage).toBe(TransactionStage.CANCELLED);
      expect(doc.cancelReason).toBe('Buyer backed out');
      expect(doc.cancelledAt).toBeInstanceOf(Date);
      expect(doc.financialBreakdown).toBeNull();
      expect(doc.save).toHaveBeenCalled();
    });
  });
});