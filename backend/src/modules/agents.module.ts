// src/modules/agents/agents.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { Agent, AgentSchema } from './agents/schemas/agent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],  // Transactions modülü agents'a bakacak, export şart
})
export class AgentsModule {}