import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiHealthCheck,
  ApiLivenessCheck,
  ApiReadinessCheck,
} from './decorators/health-api.decorator';

@ApiTags('health')
@Controller('health')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @Public()
  @ApiHealthCheck()
  async check() {
    return this.healthCheckService.checkHealth();
  }

  @Get('liveness')
  @Public()
  @ApiLivenessCheck()
  async liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @Public()
  @ApiReadinessCheck()
  async readiness() {
    return this.healthCheckService.checkReadiness();
  }
}
