import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensors.entity';
import sseEmitter from '../sse';


@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor)
    private sensorsRepository: Repository<Sensor>,
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
}
