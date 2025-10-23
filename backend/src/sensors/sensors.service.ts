import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensors.entity';


@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor)
    private sensorsRepository: Repository<Sensor>,
  ) {}

  create(data: Partial<Sensor>) {
    const newData = this.sensorsRepository.create(data);
    return this.sensorsRepository.save(newData);
  }

  findAll() {
    return this.sensorsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findLatest() {
    return this.sensorsRepository.findOne({
      order: { createdAt: 'DESC' },
    });
  }
}
