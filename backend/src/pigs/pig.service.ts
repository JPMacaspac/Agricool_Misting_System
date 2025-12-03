import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from './pig.entity';

@Injectable()
export class PigService {
  constructor(
    @InjectRepository(Pig)
    private pigRepository: Repository<Pig>,
  ) {}

  async findByRFID(rfidUid: string): Promise<Pig | null> {
    return this.pigRepository.findOne({
      where: { rfidUid },
    });
  }

  async create(rfidUid: string, pigName: string, notes?: string): Promise<Pig> {
    const pig = this.pigRepository.create({
      rfidUid,
      pigName,
      notes: notes || 'Auto-registered from RFID scan',
    });
    return this.pigRepository.save(pig);
  }

  async updateLastScanned(pigId: number): Promise<void> {
    await this.pigRepository.update(pigId, {
      lastScanned: new Date(),
    });
  }

  async getAllPigsWithLatestTemp() {
    // Add your logic to get pigs with latest temperature data
    return this.pigRepository.find();
  }
}