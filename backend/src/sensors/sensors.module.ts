import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsService } from './sensors.service';
import { SensorsController, MistingController } from './sensors.controller';
import { Sensor } from './sensors.entity';
import { MistingLog } from '../misting/misting-log.entity';
import { MqttService } from '../mqtt.service';
import { NotificationModule } from '../notifications/notification.module';
import { ThermalRecordModule } from '../thermal-records/thermal-record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, MistingLog]),
    NotificationModule,ThermalRecordModule
  ],
  controllers: [SensorsController, MistingController],
  providers: [SensorsService, MqttService],
  exports: [SensorsService],
})
export class SensorsModule {}