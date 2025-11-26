import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ThermalRecordService } from './thermal-record.service';

@Controller('api')
export class ThermalRecordController {
  constructor(private readonly thermalRecordService: ThermalRecordService) {}

  @Get('records')
  async getRecords(
    @Query('search') search?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.thermalRecordService.getRecords(search, month, year);
  }

  @Post('records')
  async createRecord(@Body() data: any) {
    return this.thermalRecordService.createRecord(data);
  }

  @Post('simulate-scan')
  async simulateScan() {
    const record = await this.thermalRecordService.simulateScan();
    return {
      message: 'Thermal scan simulated successfully',
      record: record
    };
  }
}