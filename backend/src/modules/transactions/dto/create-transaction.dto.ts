import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsPositive } from 'class-validator';

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
    description: 'Total service fee in kuruş (1 TRY = 100 kuruş)',
  })
  @IsInt()
  @IsPositive()
  totalServiceFee!: number;
}