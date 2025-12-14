import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensors.entity';
import { MistingLog } from '../misting/misting-log.entity';
import { TelegramService } from '../notifications/telegram.service';
import sseEmitter from '../sse';

interface MistingStartData {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
  mistingType?: string;
}

interface MistingEndData {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
}

@Injectable()
export class SensorsService {
  private readonly HIGH_TEMP_THRESHOLD = 35;
  private readonly LOW_WATER_THRESHOLD = 30;
  private lastLowWaterAlert = 0;

  constructor(
    @InjectRepository(Sensor)
    private sensorsRepository: Repository<Sensor>,
    @InjectRepository(MistingLog)
    private mistingLogRepository: Repository<MistingLog>,
    private telegramService: TelegramService,
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

    // ✅ Send Telegram alerts (non-blocking, async)
    this.checkAndSendAlerts(saved);
    
    return saved;
  }

  /**
   * Calculate heat index from temperature and humidity
   */
  private calculateHeatIndex(temp: number, humidity: number): number {
    if (humidity > 40) {
      return temp + (0.5 * (temp - 14.5) * (humidity / 100.0));
    }
    return temp;
  }

  /**
   * Check conditions and send Telegram alerts (non-blocking)
   */
  private async checkAndSendAlerts(sensor: Sensor) {
    try {
      const heatIndex = this.calculateHeatIndex(sensor.temperature, sensor.humidity);

      // High temperature alert
      if (sensor.temperature >= this.HIGH_TEMP_THRESHOLD && sensor.pumpStatus) {
        await this.telegramService.sendHighTempAlert({
          temperature: sensor.temperature,
          humidity: sensor.humidity,
          heatIndex: heatIndex,
          waterLevel: sensor.waterLevel,
          pumpStatus: sensor.pumpStatus,
        });
      }

      // Low water alert (with cooldown)
      const now = Date.now();
      if (
        sensor.waterLevel <= this.LOW_WATER_THRESHOLD &&
        now - this.lastLowWaterAlert > 30 * 60 * 1000 // 30 minutes cooldown
      ) {
        await this.telegramService.sendLowWaterAlert({
          waterLevel: sensor.waterLevel,
          temperature: sensor.temperature,
          pumpStatus: sensor.pumpStatus,
        });
        this.lastLowWaterAlert = now;
      }
    } catch (error) {
      // Don't let alert failures affect sensor data saving
      console.error('Telegram alert error (non-critical):', error);
    }
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
      mistingType: data.mistingType || 'AUTO',
    });
    const saved = await this.mistingLogRepository.save(newLog);

    // ✅ Send Telegram notification (non-blocking)
    this.telegramService.sendMistingStarted({
      mistingType: (data.mistingType || 'AUTO') as 'AUTO' | 'MANUAL',
      temperature: data.temperature,
      humidity: data.humidity,
      waterLevel: data.waterLevel,
    }).catch(err => console.error('Telegram misting alert error:', err));

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