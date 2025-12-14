import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private chatId: string;
  private lastAlertTime = 0;
  private readonly ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes between alerts

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID || '5547764940'; // Your Telegram Chat ID

    if (token && this.chatId) {
      try {
        this.bot = new TelegramBot(token, { polling: false });
        this.logger.log('✅ Telegram bot initialized successfully');
        this.logger.log(`📱 Notifications will be sent to Chat ID: ${this.chatId}`);
      } catch (error) {
        this.logger.error('❌ Failed to initialize Telegram bot:', error);
      }
    } else {
      this.logger.warn('⚠️ Telegram bot not configured (missing TOKEN or CHAT_ID)');
    }
  }

  /**
   * Send a message to Telegram
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.bot || !this.chatId) {
      this.logger.warn('Telegram not configured, skipping message');
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
      });
      this.logger.log('📤 Telegram message sent');
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to send Telegram message:', error);
      return false;
    }
  }

  /**
   * Send high temperature alert (with cooldown to prevent spam)
   */
  async sendHighTempAlert(data: {
    temperature: number;
    humidity: number;
    heatIndex: number;
    waterLevel: number;
    pumpStatus: boolean;
  }): Promise<void> {
    const now = Date.now();
    
    // Check cooldown
    if (now - this.lastAlertTime < this.ALERT_COOLDOWN) {
      this.logger.debug('Alert skipped (cooldown active)');
      return;
    }

    const message = `
🔥 <b>AgriCool High Temperature Alert!</b>
━━━━━━━━━━━━━━━━━━━━━
🌡️ <b>Temperature:</b> ${data.temperature.toFixed(1)}°C
💧 <b>Humidity:</b> ${data.humidity.toFixed(1)}%
🔥 <b>Heat Index:</b> ${data.heatIndex.toFixed(1)}°C
💦 <b>Water Level:</b> ${data.waterLevel}%
⚡ <b>Pump Status:</b> ${data.pumpStatus ? 'ON ✅' : 'OFF ❌'}
━━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
    `.trim();

    const sent = await this.sendMessage(message);
    if (sent) {
      this.lastAlertTime = now;
    }
  }

  /**
   * Send low water level alert
   */
  async sendLowWaterAlert(data: {
    waterLevel: number;
    temperature: number;
    pumpStatus: boolean;
  }): Promise<void> {
    const message = `
⚠️ <b>AgriCool Low Water Alert!</b>
━━━━━━━━━━━━━━━━━━━━━
💦 <b>Water Level:</b> ${data.waterLevel}%
🌡️ <b>Temperature:</b> ${data.temperature.toFixed(1)}°C
⚡ <b>Pump Status:</b> ${data.pumpStatus ? 'ON (will auto-stop)' : 'OFF'}
━━━━━━━━━━━━━━━━━━━━━
Please refill the water tank soon!
⏰ ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send misting started notification
   */
  async sendMistingStarted(data: {
    mistingType: 'AUTO' | 'MANUAL';
    temperature: number;
    humidity: number;
    waterLevel: number;
  }): Promise<void> {
    const icon = data.mistingType === 'AUTO' ? '🤖' : '👤';
    const message = `
${icon} <b>Misting Started (${data.mistingType})</b>
━━━━━━━━━━━━━━━━━━━━━
🌡️ <b>Temperature:</b> ${data.temperature.toFixed(1)}°C
💧 <b>Humidity:</b> ${data.humidity.toFixed(1)}%
💦 <b>Water Level:</b> ${data.waterLevel}%
━━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
    `.trim();

    await this.sendMessage(message);
  }

  /**
   * Send daily summary (can be called by a cron job)
   */
  async sendDailySummary(data: {
    avgTemperature: number;
    avgHumidity: number;
    mistingEvents: number;
    totalRuntime: number;
  }): Promise<void> {
    const message = `
📊 <b>AgriCool Daily Summary</b>
━━━━━━━━━━━━━━━━━━━━━
🌡️ <b>Avg Temperature:</b> ${data.avgTemperature.toFixed(1)}°C
💧 <b>Avg Humidity:</b> ${data.avgHumidity.toFixed(1)}%
💨 <b>Misting Events:</b> ${data.mistingEvents}
⏱️ <b>Total Runtime:</b> ${data.totalRuntime.toFixed(1)} min
━━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}
    `.trim();

    await this.sendMessage(message);
  }
}
