// src/modules/agents/agents.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from './schemas/agent.schema';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name)
    private readonly agentModel: Model<AgentDocument>,
  ) {}

  async create(dto: CreateAgentDto): Promise<AgentDocument> {
    try {
      const agent = await this.agentModel.create(dto);
      return agent;
    } catch (error: any) {
      // Unique index violation (email)
      if (error?.code === 11000) {
        throw new ConflictException(
          `Agent with email "${dto.email}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(options?: { activeOnly?: boolean }): Promise<AgentDocument[]> {
    const filter = options?.activeOnly === false ? {} : { active: true };
    return this.agentModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<AgentDocument> {
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) {
      throw new NotFoundException(`Agent not found: ${id}`);
    }
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto): Promise<AgentDocument> {
    try {
      const agent = await this.agentModel
        .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
        .exec();
      if (!agent) {
        throw new NotFoundException(`Agent not found: ${id}`);
      }
      return agent;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `Another agent with this email already exists`,
        );
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<AgentDocument> {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, { active: false }, { new: true })
      .exec();
    if (!agent) {
      throw new NotFoundException(`Agent not found: ${id}`);
    }
    return agent;
  }
}