import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TransactionStage } from '../schemas/transaction.schema';

export class AdvanceStageDto {
  @ApiProperty({
    enum: TransactionStage,
    example: TransactionStage.EARNEST_MONEY,
  })
  @IsEnum(TransactionStage)
  nextStage!: TransactionStage;

  @ApiPropertyOptional({ example: 'Kapora alındı, dekont arşivde' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}