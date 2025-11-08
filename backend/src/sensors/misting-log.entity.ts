import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('misting_logs')
export class MistingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  startTemperature: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  startHumidity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  startHeatIndex: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  startWaterLevel: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endTemperature: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endHumidity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endHeatIndex: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endWaterLevel: number;

  @CreateDateColumn()
  createdAt: Date;
}