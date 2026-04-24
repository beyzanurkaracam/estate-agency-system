import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdvanceStageDto } from './dto/advance-stage.dto';
import { CancelTransactionDto } from './dto/cancel-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionStage } from './schemas/transaction.schema';
import { TransactionsService } from './services/transactions.service';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction (starts in agreement)' })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with optional filters' })
  findAll(
    @Query('stage') stage?: TransactionStage,
    @Query('agentId') agentId?: string,
  ) {
    return this.transactionsService.findAll({ stage, agentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.transactionsService.findById(id);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Advance to the next stage' })
  advanceStage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdvanceStageDto,
  ) {
    return this.transactionsService.advanceStage(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a transaction with a required reason' })
  cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CancelTransactionDto,
  ) {
    return this.transactionsService.cancel(id, dto);
  }

  @Get(':id/breakdown')
  @ApiOperation({
    summary: 'Get the financial breakdown (404 if not yet completed)',
  })
  getBreakdown(@Param('id', ParseObjectIdPipe) id: string) {
    return this.transactionsService.getBreakdown(id);
  }
}