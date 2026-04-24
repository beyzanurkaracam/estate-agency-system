import { BadRequestException, Injectable } from '@nestjs/common';
import {
  StageHistoryEntry,
  TransactionStage,
} from '../schemas/transaction.schema';

@Injectable()
export class StageTransitionService {
  
  private static readonly ALLOWED_TRANSITIONS: Readonly<
    Record<TransactionStage, readonly TransactionStage[]>
  > = {
    [TransactionStage.AGREEMENT]: [
      TransactionStage.EARNEST_MONEY,
      TransactionStage.CANCELLED,
    ],
    [TransactionStage.EARNEST_MONEY]: [
      TransactionStage.TITLE_DEED,
      TransactionStage.CANCELLED,
    ],
    [TransactionStage.TITLE_DEED]: [
      TransactionStage.COMPLETED,
      TransactionStage.CANCELLED,
    ],
    [TransactionStage.COMPLETED]: [],
    [TransactionStage.CANCELLED]: [],
  };

  canTransition(from: TransactionStage, to: TransactionStage): boolean {
    return StageTransitionService.ALLOWED_TRANSITIONS[from].includes(to);
  }

  assertCanTransition(from: TransactionStage, to: TransactionStage): void {
    if (!this.canTransition(from, to)) {
      const allowed = StageTransitionService.ALLOWED_TRANSITIONS[from];
      const allowedMsg =
        allowed.length > 0
          ? `Allowed next stages: ${allowed.join(', ')}`
          : `"${from}" is a terminal stage and cannot transition`;
      throw new BadRequestException(
        `Invalid stage transition: ${from} → ${to}. ${allowedMsg}`,
      );
    }
  }

  isTerminal(stage: TransactionStage): boolean {
    return (
      StageTransitionService.ALLOWED_TRANSITIONS[stage].length === 0
    );
  }

  buildHistoryEntry(
    stage: TransactionStage,
    note?: string,
  ): StageHistoryEntry {
    return {
      stage,
      changedAt: new Date(),
      note: note?.trim() || undefined,
    };
  }
}