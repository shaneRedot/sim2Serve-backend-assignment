import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  getRoot() {
    return {
      service: 'Tweet Service',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    };
  }
}
