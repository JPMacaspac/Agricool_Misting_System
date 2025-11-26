import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { MistingLog } from './misting-log.entity';
import { MistingRealtimeGateway } from './misting-realtime.gateway';

@Injectable()
export class MistingLogService {
  constructor(
    @InjectRepository(MistingLog)
    private mistingLogRepository: Repository<MistingLog>,
    private mistingRealtimeGateway: MistingRealtimeGateway,
  ) {}

  async getTodayLogs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.mistingLogRepository.find({
      where: {
        startTime: MoreThanOrEqual(today),
      },
      order: {
        startTime: 'DESC',
      },
    });
  }

  async getAllLogs() {
    return this.mistingLogRepository.find({
      order: {
        startTime: 'DESC',
      },
      take: 100,
    });
  }

  async startMisting(data: any) {
    const log = this.mistingLogRepository.create({
      startTime: new Date(),
      startTemperature: data.temperature,
      startHumidity: data.humidity,
      startHeatIndex: data.heatIndex,
      startWaterLevel: data.waterLevel,
      mistingType: data.mistingType || 'AUTO',
    });

    const saved = await this.mistingLogRepository.save(log);
    console.log('✅ Misting started, log ID:', saved.id);

    this.mistingRealtimeGateway.emitMistingStarted({
      logId: saved.id,
      ...saved,
    });

    return { logId: saved.id, message: 'Misting started' };
  }

  async endMisting(id: number, data: any) {
    const log = await this.mistingLogRepository.findOne({ where: { id } });

    if (!log) {
      throw new Error('Misting log not found');
    }

    log.endTime = new Date();
    log.endTemperature = data.temperature;
    log.endHumidity = data.humidity;
    log.endHeatIndex = data.heatIndex;
    log.endWaterLevel = data.waterLevel;

    const saved = await this.mistingLogRepository.save(log);
    console.log('✅ Misting ended, log ID:', id);

    this.mistingRealtimeGateway.emitMistingEnded({
      logId: saved.id,
      ...saved,
    });

    return { message: 'Misting ended' };
  }
}