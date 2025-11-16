import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { MistingLogService } from './misting-log.service';

@Controller('api/misting')
export class MistingLogController {
  constructor(private readonly mistingLogService: MistingLogService) {}

  @Get('today')
  async getTodayLogs() {
    return this.mistingLogService.getTodayLogs();
  }

  @Get('all')
  async getAllLogs() {
    return this.mistingLogService.getAllLogs();
  }

  @Post('start')
  async startMisting(@Body() data: any) {
    return this.mistingLogService.startMisting(data);
  }

  @Put('end/:id')
  async endMisting(@Param('id') id: string, @Body() data: any) {
    return this.mistingLogService.endMisting(parseInt(id), data);
  }
}