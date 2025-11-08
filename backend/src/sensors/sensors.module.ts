import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsService } from './sensors.service';
import { SensorsController, MistingController } from './sensors.controller';
import { Sensor } from './sensors.entity';
import { MistingLog } from './misting-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sensor, MistingLog])],
  controllers: [SensorsController, MistingController],
  providers: [SensorsService],
})
export class SensorsModule {}