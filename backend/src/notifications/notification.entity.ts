import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'PUMP_ON' | 'PUMP_OFF' | 'MANUAL_ON' | 'MANUAL_OFF' | 'AUTO_MODE'

  @Column()
  message: string;

  @Column('decimal', { precision: 5, scale: 2 })
  temperature: number;

  @Column('decimal', { precision: 5, scale: 2 })
  humidity: number;

  @Column('int')
  waterLevel: number;

  @Column()
  pumpStatus: boolean;

  @Column()
  mode: string; // 'MANUAL' | 'AUTO'

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}