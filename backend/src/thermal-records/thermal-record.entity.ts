import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('thermal_records')
export class ThermalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 4, scale: 1 })
  bodyTemp: number;

  @Column('decimal', { precision: 4, scale: 1 })
  avgTemp: number;

  @Column('decimal', { precision: 4, scale: 1 })
  minTemp: number;

  @Column({ nullable: true })
  weight: string;

  @Column({ nullable: true })
  age: string;

  @Column({ nullable: true })
  breed: string;

  @Column({ nullable: true })
  lastFed: string;

  @Column('decimal', { precision: 4, scale: 1, nullable: true })
  ambientTemp: number;

  @Column('decimal', { precision: 4, scale: 1, nullable: true })
  humidity: number;

  @Column({ default: 'Healthy' })
  healthStatus: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  scannedAt: Date;
}