import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/user/health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'User System API',
      version: '1.0.0'
    };
  }
}
