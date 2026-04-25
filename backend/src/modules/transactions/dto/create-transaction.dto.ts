import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO4217CurrencyCode,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  property!: string;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d2' })
  @IsMongoId()
  listingAgent!: string;

  @ApiProperty({
    example: '65f1a2b3c4d5e6f7a8b9c0d3',
    description: 'May equal listingAgent if the same person fills both roles',
  })
  @IsMongoId()
  sellingAgent!: string;

  @ApiProperty({
    example: 5000000,
    description:
      "Total service fee as an integer in the currency's minor unit (e.g. kuruş for TRY, cents for EUR/USD).",
  })
  @IsInt()
  @IsPositive()
  totalServiceFee!: number;

  @ApiPropertyOptional({
    example: 'EUR',
    description:
      "ISO 4217 currency code. If omitted, the property's currency is used.",
  })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;
}