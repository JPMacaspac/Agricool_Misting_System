import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pigs')
export class Pig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  rfidUid: string;

  @Column()
  pigName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  lastScanned: Date;

  @CreateDateColumn()
  registeredDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}