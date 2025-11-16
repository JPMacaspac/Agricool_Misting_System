import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Query('limit') limit?: string) {
    return await this.notificationService.getAllNotifications(limit ? parseInt(limit) : 50);
  }

  @Get('unread-count')
  async getUnreadCount() {
    const count = await this.notificationService.getUnreadCount();
    return { count };
  }

  @Post('mark-read/:id')
  async markAsRead(@Param('id') id: string) {
    await this.notificationService.markAsRead(parseInt(id));
    return { success: true };
  }

  @Post('mark-all-read')
  async markAllAsRead() {
    await this.notificationService.markAllAsRead();
    return { success: true };
  }
}