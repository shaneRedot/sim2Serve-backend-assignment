import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'Tweet Service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
  }

  getRoot() {
    return {
      service: 'Tweet Service',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    };
  }
}
