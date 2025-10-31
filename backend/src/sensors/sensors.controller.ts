import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SensorsService } from './sensors.service';

interface SensorDataDto {
  temperature: number;
  humidity: number;
  waterLevel: number;
  pumpStatus: boolean;
}

@Controller('api/sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  async create(@Body() data: SensorDataDto) {
    console.log('Received sensor data:', data);
    return this.sensorsService.create(data);
  }

  @Get()
  findAll() {
    return this.sensorsService.findAll();
  }

  @Get('latest')
  findLatest() {
    return this.sensorsService.findLatest();
  }

  @Get('stream')
  stream(@Req() req: Request, @Res() res: Response) {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // send a comment to keep connection alive initially
    res.write(': connected\n\n');

    const sseEmitter = require('../sse').default;

    const onData = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        // ignore
      }
    };

    sseEmitter.on('data', onData);

    req.on('close', () => {
      sseEmitter.removeListener('data', onData);
    });

    return res;
  }
}
