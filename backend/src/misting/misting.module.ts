import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MistingLogController } from './misting-log.controller';
import { MistingLogService } from './misting-log.service';
import { MistingLog } from './misting-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MistingLog])],
  controllers: [MistingLogController],
  providers: [MistingLogService],
  exports: [MistingLogService],
})
export class MistingModule {}