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