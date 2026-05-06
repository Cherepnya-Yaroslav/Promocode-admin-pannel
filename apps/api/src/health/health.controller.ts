import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatusResponse } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    description: 'Reports readiness for MongoDB, ClickHouse, and Redis.'
  })
  async getHealth(): Promise<HealthStatusResponse> {
    return this.healthService.getStatus();
  }
}
