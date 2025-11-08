import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensors.entity';
import { MistingLog } from './misting-log.entity';
import sseEmitter from '../sse';

interface MistingStartData {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
}

interface MistingEndData {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
}

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor)
    private sensorsRepository: Repository<Sensor>,
    @InjectRepository(MistingLog)
    private mistingLogRepository: Repository<MistingLog>,
  ) {}

  async create(data: Partial<Sensor>) {
    const newData = this.sensorsRepository.create(data);
    const saved = await this.sensorsRepository.save(newData);
    // emit to SSE listeners (best-effort)
    try {
      sseEmitter.emit('data', saved);
    } catch (e) {
      // ignore
    }
    return saved;
  }

  findAll() {
    return this.sensorsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findLatest() {
    // Use find with take:1 to avoid TypeORM findOne requirement for selection
    const items = await this.sensorsRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return items.length > 0 ? items[0] : null;
  }

  // Misting Log Methods
  async getMistingLogs() {
    return this.mistingLogRepository.find({
      order: { startTime: 'DESC' },
    });
  }

  async startMistingLog(data: MistingStartData) {
    const newLog = this.mistingLogRepository.create({
      startTime: new Date(),
      startTemperature: data.temperature,
      startHumidity: data.humidity,
      startHeatIndex: data.heatIndex,
      startWaterLevel: data.waterLevel,
    });
    const saved = await this.mistingLogRepository.save(newLog);
    return { success: true, logId: saved.id };
  }

  async endMistingLog(logId: number, data: MistingEndData) {
    await this.mistingLogRepository.update(logId, {
      endTime: new Date(),
      endTemperature: data.temperature,
      endHumidity: data.humidity,
      endHeatIndex: data.heatIndex,
      endWaterLevel: data.waterLevel,
    });
    return { success: true };
  }
}