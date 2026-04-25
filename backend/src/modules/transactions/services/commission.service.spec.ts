import { BadRequestException } from '@nestjs/common';
import { AgentRole } from '../schemas/transaction.schema';
import { AgentInput, CommissionService } from './commission.service';

describe('CommissionService', () => {
  let service: CommissionService;

  const alice: AgentInput = { id: 'agent-alice', name: 'Alice' };
  const bob: AgentInput = { id: 'agent-bob', name: 'Bob' };

  beforeEach(() => {
    service = new CommissionService();
  });

  describe('Scenario 1: same listing and selling agent', () => {
    it('gives the agent the full agent pool (50% of total)', () => {
      const result = service.calculate(1_000_000, alice, alice);

      expect(result.agencyShare).toBe(500_000);
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0]).toEqual({
        agentId: alice.id,
        agentName: alice.name,
        roles: [AgentRole.LISTING, AgentRole.SELLING],
        amount: 500_000,
        percentage: 50,
      });
    });

    it('preserves the invariant: agency + agents = total', () => {
      const result = service.calculate(1_000_000, alice, alice);
      const sumAgents = result.agents.reduce((s, a) => s + a.amount, 0);
      expect(result.agencyShare + sumAgents).toBe(1_000_000);
      expect(result.totalDistributed).toBe(1_000_000);
    });
  });

  describe('Scenario 2: different listing and selling agents', () => {
    it('splits the agent pool equally (25% + 25%)', () => {
      const result = service.calculate(1_000_000, alice, bob);

      expect(result.agencyShare).toBe(500_000);
      expect(result.agents).toHaveLength(2);

      const [listing, selling] = result.agents;

      expect(listing).toEqual({
        agentId: alice.id,
        agentName: alice.name,
        roles: [AgentRole.LISTING],
        amount: 250_000,
        percentage: 25,
      });
      expect(selling).toEqual({
        agentId: bob.id,
        agentName: bob.name,
        roles: [AgentRole.SELLING],
        amount: 250_000,
        percentage: 25,
      });
    });

    it('assigns the 1-unit remainder to the listing agent on odd fees', () => {
      
      const result = service.calculate(1_000_001, alice, bob);

      expect(result.agencyShare).toBe(500_000);
      expect(result.agents[0].amount).toBe(250_001); 
      expect(result.agents[1].amount).toBe(250_000);
      expect(result.totalDistributed).toBe(1_000_001);
    });
  });

  describe('invariant — the sum of all shares always equals the total', () => {
    it.each([
      [1],
      [100],
      [1_000],
      [1_000_000],
      [999_999_999],
      [7], 
    ])('holds for total fee of %i minor units (same agent)', (fee) => {
      const result = service.calculate(fee, alice, alice);
      const sum =
        result.agencyShare + result.agents.reduce((s, a) => s + a.amount, 0);
      expect(sum).toBe(fee);
    });

    it.each([
      [2],
      [101],
      [1_001],
      [1_000_001],
      [999_999_999],
    ])('holds for total fee of %i minor units (different agents)', (fee) => {
      const result = service.calculate(fee, alice, bob);
      const sum =
        result.agencyShare + result.agents.reduce((s, a) => s + a.amount, 0);
      expect(sum).toBe(fee);
    });
  });

  describe('input validation', () => {
    it('rejects zero fee', () => {
      expect(() => service.calculate(0, alice, bob)).toThrow(
        BadRequestException,
      );
    });

    it('rejects negative fee', () => {
      expect(() => service.calculate(-1000, alice, bob)).toThrow(
        BadRequestException,
      );
    });

    it('rejects non-integer fee', () => {
      expect(() => service.calculate(100.5, alice, bob)).toThrow(
        BadRequestException,
      );
    });

    it('rejects missing agent id', () => {
      expect(() =>
        service.calculate(1000, { id: '', name: '' }, bob),
      ).toThrow(BadRequestException);
    });
  });
});