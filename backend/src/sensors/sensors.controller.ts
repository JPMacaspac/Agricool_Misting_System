import { Controller, Get, Post, Body } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { Sensor } from './sensors.entity';

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
}
