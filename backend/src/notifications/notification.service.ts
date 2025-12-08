import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(data: {
    type: string;
    message: string;
    temperature: number;
    humidity: number;
    waterLevel: number;
    pumpStatus: boolean;
    mode: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return await this.notificationRepository.save(notification);
  }

  // NEW: Method specifically for thermal notifications
  async createThermalNotification(data: {
    type: string;
    title: string;
    message: string;
    temperature: number;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: data.type,
      title: data.title,
      message: data.message,
      temperature: data.temperature,
      humidity: 0, // Not applicable for thermal notifications
      waterLevel: 0, // Not applicable for thermal notifications
      pumpStatus: false,
      mode: 'thermal',
      isRead: false,
    });
    return await this.notificationRepository.save(notification);
  }

  async getAllNotifications(limit: number = 50): Promise<Notification[]> {
    return await this.notificationRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(): Promise<number> {
    return await this.notificationRepository.count({
      where: { isRead: false },
    });
  }

  async markAsRead(id: number): Promise<void> {
    await this.notificationRepository.update(id, { isRead: true });
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationRepository.update({ isRead: false }, { isRead: true });
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();
  }
}