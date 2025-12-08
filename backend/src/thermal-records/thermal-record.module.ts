import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThermalRecordController } from './thermal-record.controller';
import { ThermalRecordService } from './thermal-record.service';
import { ThermalRecord } from './thermal-record.entity';
import { NotificationModule } from '../notifications/notification.module'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([ThermalRecord]),
    NotificationModule, // Add NotificationModule here
  ],
  controllers: [ThermalRecordController],
  providers: [ThermalRecordService],
  exports: [ThermalRecordService],
})
export class ThermalRecordModule {}