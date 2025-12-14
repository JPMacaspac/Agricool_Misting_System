import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationService, TelegramService],
  controllers: [NotificationController, TelegramController],
  exports: [NotificationService, TelegramService],
})
export class NotificationModule {}