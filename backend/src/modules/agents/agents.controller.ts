import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List agents (active by default, ?active=false to include inactive)',
  })
  findAll(@Query('active') active?: string) {
    const activeOnly = active !== 'false';
    return this.agentsService.findAll({ activeOnly });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by ID' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.agentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete an agent (sets active=false, preserves history)',
  })
  softDelete(@Param('id', ParseObjectIdPipe) id: string) {
    return this.agentsService.softDelete(id);
  }
}