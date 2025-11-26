import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ThermalRecord } from './thermal-record.entity';

@Injectable()
export class ThermalRecordService {
  constructor(
    @InjectRepository(ThermalRecord)
    private thermalRecordRepository: Repository<ThermalRecord>,
  ) {}

  // Determine health status based on temperature
  private determineHealthStatus(bodyTemp: number): string {
    if (bodyTemp < 38.0) return 'Low Temp';
    if (bodyTemp >= 38.0 && bodyTemp <= 39.5) return 'Healthy';
    if (bodyTemp > 39.5 && bodyTemp < 40.0) return 'Elevated';
    return 'Fever Alert';
  }


    // ✅ ADD THIS: Create a simple thermal record from sensor data
// ✅ UPDATED: Create a simple thermal record from sensor data
async create(data: {
  maxTemp?: number;
  minTemp?: number;
  avgTemp: number;
}): Promise<ThermalRecord> {
  const healthStatus = this.determineHealthStatus(data.maxTemp || data.avgTemp);

  const record = this.thermalRecordRepository.create({
    name: 'Auto-detected',
    bodyTemp: data.maxTemp || data.avgTemp,
    avgTemp: data.avgTemp,
    minTemp: data.minTemp || data.avgTemp,
    weight: 'N/A',
    age: 'N/A',
    breed: 'N/A',
    lastFed: 'N/A',
    // Remove ambientTemp and humidity if null - let them default to undefined
    healthStatus: healthStatus,
    notes: 'Automatic thermal reading from MLX90640 sensor'
  });

  const saved = await this.thermalRecordRepository.save(record);
  console.log('✅ Auto thermal reading saved, ID:', saved.id);
  
  return saved;
}



  // Get all records with optional filters
  async getRecords(search?: string, month?: string, year?: string) {
    const queryBuilder = this.thermalRecordRepository.createQueryBuilder('record');

    // Search filter
    if (search) {
      queryBuilder.where(
        '(record.name LIKE :search OR CAST(record.bodyTemp AS CHAR) LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Month filter
    if (month && month !== 'all') {
      queryBuilder.andWhere('MONTH(record.scannedAt) = :month', { month });
    }

    // Year filter
    if (year && year !== 'all') {
      queryBuilder.andWhere('YEAR(record.scannedAt) = :year', { year });
    }

    const records = await queryBuilder
      .orderBy('record.scannedAt', 'DESC')
      .getMany();

    // Format records for frontend
const formattedRecords = records.map(record => ({
  id: record.id,
  name: record.name,
  bodyTemp: Number(record.bodyTemp).toFixed(1),
  avgTemp: Number(record.avgTemp).toFixed(1),
  minTemp: Number(record.minTemp).toFixed(1),
  weight: record.weight,
  age: record.age,
  breed: record.breed,
  lastFed: record.lastFed,
  ambientTemp: record.ambientTemp ? Number(record.ambientTemp).toFixed(1) : 'N/A',
  humidity: record.humidity ? Number(record.humidity).toFixed(1) : 'N/A',
  healthStatus: record.healthStatus,
  notes: record.notes || 'No observations recorded',
  date: new Date(record.scannedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }),
  time: new Date(record.scannedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}));

    return {
      count: formattedRecords.length,
      records: formattedRecords
    };
  }

  // Create a new thermal scan record
  async createRecord(data: any) {
    const healthStatus = this.determineHealthStatus(data.bodyTemp);

    const record = this.thermalRecordRepository.create({
      name: data.name,
      bodyTemp: data.bodyTemp,
      avgTemp: data.avgTemp,
      minTemp: data.minTemp,
      weight: data.weight,
      age: data.age,
      breed: data.breed,
      lastFed: data.lastFed,
      ambientTemp: data.ambientTemp,
      humidity: data.humidity,
      healthStatus: healthStatus,
      notes: data.notes
    });

    const saved = await this.thermalRecordRepository.save(record);
    console.log('✅ Thermal scan saved, ID:', saved.id);
    
    return saved;
  }

  // Simulate a thermal scan (for testing without hardware)
  async simulateScan() {
    const randomTemp = (min: number, max: number) => 
      (Math.random() * (max - min) + min).toFixed(1);

    const pigNames = [
      'Wilbur', 'Babe', 'Peppa', 'Hamilton', 'Napoleon',
      'Snowball', 'Squealer', 'Charlotte', 'Porky', 'Miss Piggy'
    ];

    const breeds = ['Yorkshire', 'Duroc', 'Hampshire', 'Berkshire', 'Landrace'];

    const bodyTemp = parseFloat(randomTemp(37.5, 40.5));
    const avgTemp = bodyTemp - parseFloat(randomTemp(0.2, 0.8));
    const minTemp = avgTemp - parseFloat(randomTemp(0.3, 0.7));

    const simulatedData = {
      name: pigNames[Math.floor(Math.random() * pigNames.length)] + '-' + Math.floor(Math.random() * 100),
      bodyTemp: bodyTemp,
      avgTemp: avgTemp,
      minTemp: minTemp,
      weight: `${Math.floor(Math.random() * 50) + 80}kg`,
      age: `${Math.floor(Math.random() * 12) + 6} months`,
      breed: breeds[Math.floor(Math.random() * breeds.length)],
      lastFed: `${Math.floor(Math.random() * 6) + 1}h ago`,
      ambientTemp: parseFloat(randomTemp(25, 32)),
      humidity: parseFloat(randomTemp(60, 85)),
      notes: bodyTemp >= 40 
        ? 'High fever detected. Immediate veterinary attention recommended.' 
        : bodyTemp > 39.5 
        ? 'Temperature slightly elevated. Continue monitoring.' 
        : 'No abnormalities detected. Pig appears healthy.'
    };

    return this.createRecord(simulatedData);
  }
}