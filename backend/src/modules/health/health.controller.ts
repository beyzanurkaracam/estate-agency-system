import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + MongoDB readiness probe' })
  async check() {
    const dbState = this.connection.readyState;
    const dbUp = dbState === 1;

    if (!dbUp) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: { up: false, readyState: dbState },
      });
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { up: true },
    };
  }
}
