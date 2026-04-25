import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @ApiPropertyOptional({ example: true, description: 'Reactivate or deactivate agent' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}