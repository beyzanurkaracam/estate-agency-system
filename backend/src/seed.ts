import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from './app.module';
import { Agent, AgentDocument } from './modules/agents/schemas/agent.schema';
import {
  Property,
  PropertyDocument,
  PropertyType,
} from './modules/properties/schemas/property.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionStage,
} from './modules/transactions/schemas/transaction.schema';

async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const agentModel = app.get<Model<AgentDocument>>(getModelToken(Agent.name));
    const propertyModel = app.get<Model<PropertyDocument>>(
      getModelToken(Property.name),
    );
    const transactionModel = app.get<Model<TransactionDocument>>(
      getModelToken(Transaction.name),
    );

    logger.log('Clearing existing data…');
    await Promise.all([
      transactionModel.deleteMany({}),
      propertyModel.deleteMany({}),
      agentModel.deleteMany({}),
    ]);

    logger.log('Seeding agents…');
    const [alice, bob, carol] = await agentModel.insertMany([
      {
        name: 'Alice Yılmaz',
        email: 'alice@agency.test',
        phone: '+90 555 100 00 01',
        active: true,
      },
      {
        name: 'Bob Demir',
        email: 'bob@agency.test',
        phone: '+90 555 100 00 02',
        active: true,
      },
      {
        name: 'Carol Kaya',
        email: 'carol@agency.test',
        phone: '+90 555 100 00 03',
        active: true,
      },
    ]);

    logger.log('Seeding properties…');
    const [flatKadikoy, houseCesme, officeLevent] = await propertyModel.insertMany([
      {
        address: {
          street: 'Bahariye Cad. No:42',
          district: 'Kadıköy',
          city: 'İstanbul',
          postalCode: '34710',
        },
        type: PropertyType.APARTMENT,
        listingPrice: 450_000_000, 
        currency: 'TRY',
        listedBy: alice._id,
      },
      {
        address: {
          street: 'Dalyan Sok. No:7',
          district: 'Çeşme',
          city: 'İzmir',
          postalCode: '35930',
        },
        type: PropertyType.HOUSE,
        listingPrice: 1_250_000_000, 
        currency: 'TRY',
        listedBy: bob._id,
      },
      {
        address: {
          street: 'Büyükdere Cad. No:201',
          district: 'Levent',
          city: 'İstanbul',
        },
        type: PropertyType.OFFICE,
        listingPrice: 3_200_000_000, 
        currency: 'TRY',
        listedBy: carol._id,
      },
    ]);

    logger.log('Seeding transactions…');
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000);

    await transactionModel.create({
      property: flatKadikoy._id,
      listingAgent: alice._id,
      sellingAgent: alice._id,
      totalServiceFee: 9_000_000, 
      stage: TransactionStage.AGREEMENT,
      stageHistory: [
        {
          stage: TransactionStage.AGREEMENT,
          changedAt: daysAgo(3),
          note: 'Transaction created',
        },
      ],
    });

    await transactionModel.create({
      property: houseCesme._id,
      listingAgent: bob._id,
      sellingAgent: alice._id,
      totalServiceFee: 25_000_000, // 250K TRY
      stage: TransactionStage.EARNEST_MONEY,
      stageHistory: [
        {
          stage: TransactionStage.AGREEMENT,
          changedAt: daysAgo(10),
          note: 'Transaction created',
        },
        {
          stage: TransactionStage.EARNEST_MONEY,
          changedAt: daysAgo(4),
          note: 'Earnest money received',
        },
      ],
    });

    const completedFee = 64_000_000; 
    await transactionModel.create({
      property: officeLevent._id,
      listingAgent: carol._id,
      sellingAgent: bob._id,
      totalServiceFee: completedFee,
      stage: TransactionStage.COMPLETED,
      stageHistory: [
        { stage: TransactionStage.AGREEMENT, changedAt: daysAgo(30) },
        { stage: TransactionStage.EARNEST_MONEY, changedAt: daysAgo(20) },
        { stage: TransactionStage.TITLE_DEED, changedAt: daysAgo(5) },
        { stage: TransactionStage.COMPLETED, changedAt: daysAgo(1) },
      ],
      financialBreakdown: {
        calculatedAt: daysAgo(1),
        agencyShare: completedFee / 2,
        agents: [
          {
            agentId: carol._id as Types.ObjectId,
            agentName: carol.name,
            roles: ['listing'],
            amount: completedFee / 4,
            percentage: 25,
          },
          {
            agentId: bob._id as Types.ObjectId,
            agentName: bob.name,
            roles: ['selling'],
            amount: completedFee / 4,
            percentage: 25,
          },
        ],
        totalDistributed: completedFee,
      },
    });

    logger.log('✅ Seed complete');
    logger.log(`   Agents: 3  |  Properties: 3  |  Transactions: 3`);
  } catch (err) {
    logger.error('Seed failed', err as Error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seed();
