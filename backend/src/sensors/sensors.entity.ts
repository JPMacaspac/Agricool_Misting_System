import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('sensor_data')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 5, scale: 2 })
  temperature: number;

  @Column('decimal', { precision: 5, scale: 2 })
  humidity: number;

  @Column('int')
  waterLevel: number;

  @Column('boolean')
  pumpStatus: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
