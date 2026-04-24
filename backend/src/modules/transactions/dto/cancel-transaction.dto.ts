// src/modules/transactions/dto/cancel-transaction.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelTransactionDto {
  @ApiProperty({ example: 'Alıcı finansman alamadı' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}