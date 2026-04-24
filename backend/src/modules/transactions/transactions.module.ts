import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertiesModule } from '../properties/properties.module';
import {
  Transaction,
  TransactionSchema,
} from './schemas/transaction.schema';
import { TransactionsController } from './transactions.controller';
import { CommissionService } from './services/commission.service';
import { StageTransitionService } from './services/stage-transition.service';
import { TransactionsService } from './services/transactions.service';
import { AgentsModule } from '../agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    AgentsModule,
    PropertiesModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    CommissionService,
    StageTransitionService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}