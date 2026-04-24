import { BadRequestException } from '@nestjs/common';
import { TransactionStage } from '../schemas/transaction.schema';
import { StageTransitionService } from './stage-transition.service';

describe('StageTransitionService', () => {
  let service: StageTransitionService;

  beforeEach(() => {
    service = new StageTransitionService();
  });

  describe('canTransition — valid transitions', () => {
    it.each([
      [TransactionStage.AGREEMENT, TransactionStage.EARNEST_MONEY],
      [TransactionStage.AGREEMENT, TransactionStage.CANCELLED],
      [TransactionStage.EARNEST_MONEY, TransactionStage.TITLE_DEED],
      [TransactionStage.EARNEST_MONEY, TransactionStage.CANCELLED],
      [TransactionStage.TITLE_DEED, TransactionStage.COMPLETED],
      [TransactionStage.TITLE_DEED, TransactionStage.CANCELLED],
    ])('allows %s → %s', (from, to) => {
      expect(service.canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — invalid transitions', () => {
    it.each([
      // Jumping stages
      [TransactionStage.AGREEMENT, TransactionStage.TITLE_DEED],
      [TransactionStage.AGREEMENT, TransactionStage.COMPLETED],
      [TransactionStage.EARNEST_MONEY, TransactionStage.COMPLETED],
      // Going backward
      [TransactionStage.EARNEST_MONEY, TransactionStage.AGREEMENT],
      [TransactionStage.TITLE_DEED, TransactionStage.EARNEST_MONEY],
      [TransactionStage.TITLE_DEED, TransactionStage.AGREEMENT],
      // From terminal states
      [TransactionStage.COMPLETED, TransactionStage.AGREEMENT],
      [TransactionStage.COMPLETED, TransactionStage.CANCELLED],
      [TransactionStage.CANCELLED, TransactionStage.AGREEMENT],
      [TransactionStage.CANCELLED, TransactionStage.COMPLETED],
    ])('rejects %s → %s', (from, to) => {
      expect(service.canTransition(from, to)).toBe(false);
    });
  });

  describe('assertCanTransition', () => {
    it('does not throw on valid transition', () => {
      expect(() =>
        service.assertCanTransition(
          TransactionStage.AGREEMENT,
          TransactionStage.EARNEST_MONEY,
        ),
      ).not.toThrow();
    });

    it('throws BadRequestException with helpful message on invalid transition', () => {
      expect(() =>
        service.assertCanTransition(
          TransactionStage.AGREEMENT,
          TransactionStage.COMPLETED,
        ),
      ).toThrow(BadRequestException);

      try {
        service.assertCanTransition(
          TransactionStage.AGREEMENT,
          TransactionStage.COMPLETED,
        );
      } catch (e: any) {
        expect(e.message).toContain('agreement → completed');
        expect(e.message).toContain('earnest_money');
      }
    });

    it('mentions terminal state in error when applicable', () => {
      try {
        service.assertCanTransition(
          TransactionStage.COMPLETED,
          TransactionStage.CANCELLED,
        );
      } catch (e: any) {
        expect(e.message).toContain('terminal');
      }
    });
  });

  describe('isTerminal', () => {
    it.each([
      [TransactionStage.AGREEMENT, false],
      [TransactionStage.EARNEST_MONEY, false],
      [TransactionStage.TITLE_DEED, false],
      [TransactionStage.COMPLETED, true],
      [TransactionStage.CANCELLED, true],
    ])('%s → %s', (stage, expected) => {
      expect(service.isTerminal(stage)).toBe(expected);
    });
  });

  describe('buildHistoryEntry', () => {
    it('creates an entry with stage, timestamp, and optional note', () => {
      const before = Date.now();
      const entry = service.buildHistoryEntry(
        TransactionStage.EARNEST_MONEY,
        'Kapora alındı',
      );
      const after = Date.now();

      expect(entry.stage).toBe(TransactionStage.EARNEST_MONEY);
      expect(entry.note).toBe('Kapora alındı');
      expect(entry.changedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.changedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('omits empty notes', () => {
      expect(service.buildHistoryEntry(TransactionStage.AGREEMENT).note).toBeUndefined();
      expect(
        service.buildHistoryEntry(TransactionStage.AGREEMENT, '   ').note,
      ).toBeUndefined();
    });
  });
});