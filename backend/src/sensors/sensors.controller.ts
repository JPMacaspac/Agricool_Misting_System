import { Controller, Get, Post, Put, Body, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SensorsService } from './sensors.service';
import { MqttService } from '../mqtt.service';
import { NotificationService } from '../notifications/notification.service'; // ADD THIS
import { ThermalRecordService } from '../thermal-records/thermal-record.service';

interface SensorDataDto {
  temperature: number;
  humidity: number;
  waterLevel: number;
  pumpStatus: boolean;
  manualMode?: boolean; // ADD THIS
  pigBodyTemp?: number;      // ADD THESE
  pigMinTemp?: number;        // ADD THESE
  pigAvgTemp?: number;        // ADD THESE
  pigTempValid?: boolean;     // ADD THESE
}

interface MistingStartDto {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
}

interface MistingEndDto {
  temperature: number;
  humidity: number;
  heatIndex: number;
  waterLevel: number;
}

@Controller('api/sensors')
export class SensorsController {
  private previousPumpStatus: boolean = false; // ADD THIS
  private currentMode: string = 'AUTO'; // ADD THIS

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly mqttService: MqttService,
    private readonly notificationService: NotificationService, // ADD THIS
    private readonly thermalRecordService: ThermalRecordService,
  ) {}

@Post()
async create(@Body() createSensorDto: {
  temperature: number;
  humidity: number;
  waterLevel: number;
  pumpStatus: boolean;
  manualMode?: boolean;
  pigBodyTemp?: number;
  pigMinTemp?: number;
  pigAvgTemp?: number;
  pigTempValid?: boolean;
}) {
  console.log('Received sensor data:', createSensorDto);
  
  // Save sensor data (existing)
  const sensor = await this.sensorsService.create({
    temperature: createSensorDto.temperature,
    humidity: createSensorDto.humidity,
    waterLevel: createSensorDto.waterLevel,
    pumpStatus: createSensorDto.pumpStatus,
    manualMode: createSensorDto.manualMode,
  });

  // Track misting type based on manualMode flag
  if (createSensorDto.manualMode !== undefined) {
    this.currentMode = createSensorDto.manualMode ? 'MANUAL' : 'AUTO';
  }

  // Save thermal data if valid
  if (createSensorDto.pigTempValid && createSensorDto.pigAvgTemp) {
    try {
      await this.thermalRecordService.create({
        maxTemp: createSensorDto.pigBodyTemp,
        minTemp: createSensorDto.pigMinTemp,
        avgTemp: createSensorDto.pigAvgTemp,
      });
    } catch (error) {
      console.error('Error saving thermal record:', error);
    }
  }

  // Check for pump status changes and create notifications
  await this.checkPumpStatusChange(sensor);
  
  return { success: true, data: sensor };
}

  @Get()
  findAll() {
    return this.sensorsService.findAll();
  }

  @Get('latest')
  findLatest() {
    return this.sensorsService.findLatest();
  }

  @Get('logs')
  findLogs() {
    return this.sensorsService.findAll();
  }

  // ✅ UPDATED: Pump control with MQTT + Notifications
  @Post('pump/manual')
  async manualPumpControl(@Body() body: { action: 'on' | 'off' }) {
    console.log(`📱 Manual pump control: ${body.action}`);

    // Publish to MQTT
    const command = body.action === 'on' ? 'MANUAL_ON' : 'MANUAL_OFF';
    this.mqttService.publish('agricool/pump/command', command);

    // ✅ ADD: Create notification for manual control
    const latest = await this.sensorsService.findLatest();
    if (latest) {
      this.currentMode = 'MANUAL';
      await this.notificationService.createNotification({
        type: command,
        message: `Pump manually turned ${body.action.toUpperCase()} - Temp: ${latest.temperature}°C, Humidity: ${latest.humidity}%, Water: ${latest.waterLevel}%`,
        temperature: latest.temperature,
        humidity: latest.humidity,
        waterLevel: latest.waterLevel,
        pumpStatus: body.action === 'on',
        mode: 'MANUAL',
      });
      // Sync previous pump status so the incoming sensor POST won't
      // immediately generate a duplicate notification for the same change.
      this.previousPumpStatus = body.action === 'on';
    }

    return {
      success: true,
      action: body.action,
      message: `Pump ${body.action.toUpperCase()} command sent`,
    };
  }

  @Post('pump/auto')
  async switchToAutoMode() {
    console.log('🤖 Switching to AUTO mode');

    // Publish to MQTT
    this.mqttService.publish('agricool/pump/command', 'AUTO_MODE');

    // ✅ ADD: Create notification for mode change
    const latest = await this.sensorsService.findLatest();
    if (latest) {
      this.currentMode = 'AUTO';
      await this.notificationService.createNotification({
        type: 'AUTO_MODE',
        message: `Switched to AUTO mode - Temp: ${latest.temperature}°C, Humidity: ${latest.humidity}%, Water: ${latest.waterLevel}%`,
        temperature: latest.temperature,
        humidity: latest.humidity,
        waterLevel: latest.waterLevel,
        pumpStatus: latest.pumpStatus,
        mode: 'AUTO',
      });
      // Keep previousPumpStatus in sync with current sensor value to
      // avoid duplicate notifications when the sensor update arrives.
      this.previousPumpStatus = latest.pumpStatus;
    }

    return {
      success: true,
      message: 'Switched to AUTO mode',
    };
  }

  

  @Get('stream')
  async stream(@Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    res.write(': connected\n\n');

    const sseEmitter = require('../sse').default;

    const onData = async (data: any) => {
      try {
        // Streaming should only forward data to clients.
        // Pump status change checks are performed when sensor POSTs arrive
        // (in the create() handler) to avoid duplicate notifications
        // when SSE listeners are connected.
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        // ignore
      }
    };

    sseEmitter.on('data', onData);

    req.on('close', () => {
      sseEmitter.removeListener('data', onData);
    });

    return res;
  }

  // ✅ ADD THIS NEW METHOD: Check for pump status changes
  private async checkPumpStatusChange(sensor: any) {
    const currentStatus = sensor.pumpStatus;

    // Only create notification if status actually changed
    if (currentStatus !== this.previousPumpStatus) {
      const notificationType = currentStatus ? 'PUMP_ON' : 'PUMP_OFF';
      const statusText = currentStatus ? 'ON' : 'OFF';

      await this.notificationService.createNotification({
        type: notificationType,
        message: `Pump turned ${statusText} - Temp: ${sensor.temperature}°C, Humidity: ${sensor.humidity}%, Water: ${sensor.waterLevel}%`,
        temperature: sensor.temperature,
        humidity: sensor.humidity,
        waterLevel: sensor.waterLevel,
        pumpStatus: currentStatus,
        mode: sensor.manualMode ? 'MANUAL' : 'AUTO',
      });

      this.previousPumpStatus = currentStatus;
    }
  }
}

@Controller('api/misting')
export class MistingController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get('logs')
  getMistingLogs() {
    return this.sensorsService.getMistingLogs();
  }

  @Post('start')
  startMistingLog(@Body() data: MistingStartDto) {
    console.log('Misting started:', data);
    return this.sensorsService.startMistingLog(data);
  }

  @Put('end/:logId')
  endMistingLog(@Param('logId') logId: string, @Body() data: MistingEndDto) {
    console.log('Misting ended:', logId, data);
    return this.sensorsService.endMistingLog(parseInt(logId), data);
  }
}