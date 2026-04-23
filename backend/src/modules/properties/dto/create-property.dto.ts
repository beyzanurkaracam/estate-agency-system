// src/modules/properties/dto/create-property.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { PropertyType } from '../schemas/property.schema';
import { AddressDto } from './address.dto';

export class CreatePropertyDto {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiProperty({
    example: 25000000,
    description: 'Listing price in kuruş (minor unit). 1 TRY = 100 kuruş.',
  })
  @IsInt()
  @IsPositive()
  listingPrice!: number;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  listedBy!: string;
}