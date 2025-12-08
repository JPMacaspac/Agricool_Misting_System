import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ThermalRecordService } from './thermal-record.service';
import { NotificationService } from '../notifications/notification.service';

// Store last notified status to avoid spam
const lastThermalNotifications = new Map<number, number>();

@Controller('thermal')
export class ThermalRecordController {
  constructor(
    private readonly thermalRecordService: ThermalRecordService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('records')
  async getRecords(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.thermalRecordService.getRecords(search, month, year);
  }

  @Post('record')
  async createRecord(@Body() data: any) {
    // Create the thermal record
    const record = await this.thermalRecordService.createRecord(data);
    
    // Check and create notification if needed
    await this.checkAndCreateThermalNotification(record);
    
    return record;
  }

  @Post('simulate-scan')
  async simulateScan() {
    const record = await this.thermalRecordService.simulateScan();
    
    // Check and create notification for simulated scan too
    await this.checkAndCreateThermalNotification(record);
    
    return {
      message: 'Thermal scan simulated successfully',
      record: record
    };
  }

  // Helper method to check temperature and create notifications
  private async checkAndCreateThermalNotification(pigRecord: any): Promise<void> {
    const { id, name, bodyTemp, healthStatus } = pigRecord;
    
    // Get last notification time for this pig
    const lastNotif = lastThermalNotifications.get(id);
    const now = Date.now();
    
    // Only send notification if 5 minutes passed since last one (avoid spam)
    if (lastNotif && (now - lastNotif) < 5 * 60 * 1000) {
      console.log(`⏳ Skipping notification for ${name} - cooldown active`);
      return;
    }

    let notificationType: string | null = null;
    let notificationTitle: string | null = null;
    let notificationMessage: string | null = null;

    // Check temperature levels
    const temp = parseFloat(bodyTemp);
    
    if (temp >= 40.0 && healthStatus === 'Fever Alert') {
      // RED - Critical/Fever
      notificationType = 'high_temp';
      notificationTitle = '🚨 CRITICAL: Fever Detected!';
      notificationMessage = `${name} has reached FEVER level (${bodyTemp}°C)! Immediate attention required. Check your pigs now.`;
    } else if (temp >= 39.5 && temp < 40.0 && healthStatus === 'Elevated') {
      // ORANGE - Elevated
      notificationType = 'elevated_temp';
      notificationTitle = '⚠️ WARNING: Elevated Temperature';
      notificationMessage = `${name} has elevated temperature (${bodyTemp}°C). Monitor closely and check your pigs.`;
    }

    // Create notification if threshold reached
    if (notificationType && notificationTitle && notificationMessage) {
      try {
        await this.notificationService.createThermalNotification({
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          temperature: temp,
        });
        
        // Update last notification time
        lastThermalNotifications.set(id, now);
        
        console.log(`📢 Thermal notification created for ${name}: ${notificationTitle}`);
      } catch (error) {
        console.error('Failed to create thermal notification:', error);
      }
    } else {
      console.log(`✅ Temperature normal for ${name} (${bodyTemp}°C) - No notification needed`);
    }
  }
}