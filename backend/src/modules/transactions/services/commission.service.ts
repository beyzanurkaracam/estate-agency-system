import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentRole } from '../schemas/transaction.schema';

export interface AgentInput {
  id: string;
  name: string;
}

export interface BreakdownAgentResult {
  agentId: string;
  agentName: string;
  roles: AgentRole[];
  amount: number;
  percentage: number;
}

export interface CommissionBreakdownResult {
  agencyShare: number;
  agents: BreakdownAgentResult[];
  totalDistributed: number;
}

@Injectable()
export class CommissionService {
  private static readonly AGENCY_SHARE_RATIO = 0.5;


  calculate(
    totalServiceFee: number,
    listingAgent: AgentInput,
    sellingAgent: AgentInput,
  ): CommissionBreakdownResult {
    this.assertValidInput(totalServiceFee, listingAgent, sellingAgent);

    const agencyShare = Math.floor(
      totalServiceFee * CommissionService.AGENCY_SHARE_RATIO,
    );
    const agentPool = totalServiceFee - agencyShare;

    const isSameAgent = listingAgent.id === sellingAgent.id;

    const agents: BreakdownAgentResult[] = isSameAgent
      ? this.buildSingleAgentShare(listingAgent, agentPool)
      : this.buildSplitAgentShares(listingAgent, sellingAgent, agentPool);

    const totalDistributed =
      agencyShare + agents.reduce((sum, a) => sum + a.amount, 0);

    if (totalDistributed !== totalServiceFee) {
      throw new Error(
        `Commission invariant broken: ${totalDistributed} !== ${totalServiceFee}`,
      );
    }

    return { agencyShare, agents, totalDistributed };
  }

  private buildSingleAgentShare(
    agent: AgentInput,
    agentPool: number,
  ): BreakdownAgentResult[] {
    return [
      {
        agentId: agent.id,
        agentName: agent.name,
        roles: [AgentRole.LISTING, AgentRole.SELLING],
        amount: agentPool,
        percentage: 50,
      },
    ];
  }

  private buildSplitAgentShares(
    listingAgent: AgentInput,
    sellingAgent: AgentInput,
    agentPool: number,
  ): BreakdownAgentResult[] {
    const half = Math.floor(agentPool / 2);
    const remainder = agentPool - half * 2; 

    return [
      {
        agentId: listingAgent.id,
        agentName: listingAgent.name,
        roles: [AgentRole.LISTING],
        amount: half + remainder, 
        percentage: 25,
      },
      {
        agentId: sellingAgent.id,
        agentName: sellingAgent.name,
        roles: [AgentRole.SELLING],
        amount: half,
        percentage: 25,
      },
    ];
  }

  private assertValidInput(
    totalServiceFee: number,
    listingAgent: AgentInput,
    sellingAgent: AgentInput,
  ): void {
    if (!Number.isInteger(totalServiceFee)) {
      throw new BadRequestException(
        "totalServiceFee must be an integer (currency's minor unit)",
      );
    }
    if (totalServiceFee <= 0) {
      throw new BadRequestException('totalServiceFee must be positive');
    }
    if (!listingAgent?.id || !sellingAgent?.id) {
      throw new BadRequestException('Both agents must be provided');
    }
  }
}