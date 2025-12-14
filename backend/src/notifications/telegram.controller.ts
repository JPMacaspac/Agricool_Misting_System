import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from '../notifications/telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Test endpoint to send a test message
   * POST /api/telegram/test
   * Body: { "message": "Test message" }
   */
  @Post('test')
  async sendTestMessage(@Body('message') message: string) {
    if (!message) {
      message = '✅ Telegram bot is working! This is a test message from AgriCool system.';
    }
    
    const sent = await this.telegramService.sendMessage(message);
    
    return {
      success: sent,
      message: sent ? 'Message sent successfully' : 'Failed to send message (check logs)',
    };
  }

  /**
   * Test high temperature alert
   * POST /api/telegram/test-alert
   */
  @Post('test-alert')
  async sendTestAlert() {
    await this.telegramService.sendHighTempAlert({
      temperature: 36.5,
      humidity: 85.2,
      heatIndex: 38.7,
      waterLevel: 75,
      pumpStatus: true,
    });

    return { success: true, message: 'Test alert sent' };
  }
}
