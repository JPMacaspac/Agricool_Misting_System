import { Controller, Get, Post, Put, Body, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SensorsService } from './sensors.service';
import { MqttService } from '../mqtt.service';
import { NotificationService } from '../notifications/notification.service';
import { ThermalRecordService } from '../thermal-records/thermal-record.service';

interface SensorDataDto {
  temperature: number;
  humidity: number;
  waterLevel: number;
  pumpStatus: boolean;
  manualMode?: boolean;
  pigBodyTemp?: number;
  pigMinTemp?: number;
  pigAvgTemp?: number;
  pigTempValid?: boolean;
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

@Controller('sensors')  // ✅ FIXED: Removed 'api/'
export class SensorsController {
  private previousPumpStatus: boolean = false;
  private currentMode: string = 'AUTO';

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly mqttService: MqttService,
    private readonly notificationService: NotificationService,
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
    
    // Save sensor data
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
// Save thermal data if valid
// Save thermal data if valid
if (createSensorDto.pigTempValid && createSensorDto.pigBodyTemp) {
  try {
    await this.thermalRecordService.createRecord({
      name: 'Auto-detected Pig', // ✅ ADD THIS - Required field!
      rfidUID: 'AUTO_DETECTED',
      bodyTemp: createSensorDto.pigBodyTemp,
      minTemp: createSensorDto.pigMinTemp || createSensorDto.pigBodyTemp,
      avgTemp: createSensorDto.pigAvgTemp || createSensorDto.pigBodyTemp,
      tempStatus: this.getTempStatus(createSensorDto.pigBodyTemp),
      ambientTemp: createSensorDto.temperature,
      ambientHumidity: createSensorDto.humidity,
      healthStatus: this.getTempStatus(createSensorDto.pigBodyTemp), // ✅ ADD THIS if needed
    });
    console.log('✅ Auto-saved thermal record from sensor data');
  } catch (error) {
    console.error('❌ Error saving thermal record:', error);
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

  @Post('pump/manual')
  async manualPumpControl(@Body() body: { action: 'on' | 'off' }) {
    console.log(`📱 Manual pump control: ${body.action}`);

    const command = body.action === 'on' ? 'MANUAL_ON' : 'MANUAL_OFF';
    this.mqttService.publish('agricool/pump/command', command);

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

    this.mqttService.publish('agricool/pump/command', 'AUTO_MODE');

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

private async checkPumpStatusChange(sensor: any) {
    const currentStatus = sensor.pumpStatus;

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

  // ✅ ADD THIS METHOD HERE
  private getTempStatus(temp: number): string {
    if (temp >= 40.0) return 'Fever Alert';
    if (temp >= 39.5) return 'Elevated';
    if (temp >= 38.0) return 'Normal';
    return 'Low Temp';
  }
}

@Controller('misting')  // ✅ FIXED: Removed 'api/'
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