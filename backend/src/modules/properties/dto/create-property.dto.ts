import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsInt,
  IsMongoId,
  IsOptional,
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
    description:
      "Listing price as an integer in the currency's minor unit (e.g. kuruş for TRY, cents for EUR/USD, yen for JPY).",
  })
  @IsInt()
  @IsPositive()
  listingPrice!: number;

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  listedBy!: string;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'ISO 4217 currency code. Defaults to TRY when omitted.',
  })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;
}