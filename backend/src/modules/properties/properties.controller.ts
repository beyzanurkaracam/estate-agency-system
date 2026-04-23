// src/modules/properties/properties.controller.ts
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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyType } from './schemas/property.schema';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new property listing' })
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List properties with optional filters' })
  findAll(
    @Query('city') city?: string,
    @Query('type') type?: PropertyType,
    @Query('listedBy') listedBy?: string,
  ) {
    return this.propertiesService.findAll({ city, type, listedBy });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by ID' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.propertiesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertiesService.update(id, dto);
  }
}