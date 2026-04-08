import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  check() {
    return {
      ok: true,
      database: this.dataSource.isInitialized ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
