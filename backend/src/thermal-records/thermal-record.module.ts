import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThermalRecordController } from './thermal-record.controller';
import { ThermalRecordService } from './thermal-record.service';
import { ThermalRecord } from './thermal-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThermalRecord])],
  controllers: [ThermalRecordController],
  providers: [ThermalRecordService],
  exports: [ThermalRecordService],
})
export class ThermalRecordModule {}