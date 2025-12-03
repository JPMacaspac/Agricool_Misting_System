import { Controller, Post, Body, HttpException, HttpStatus, Get } from '@nestjs/common';
import { PigService } from './pig.service';

@Controller('pigs')
export class PigController {
  constructor(private readonly pigService: PigService) {}

  // ✅ ADD THIS NEW ENDPOINT FOR RFID SCANNING
  @Post('rfid/scan')
  async scanRFID(@Body() body: { 
    rfidUID: string; 
    scanType?: string; 
    location?: string 
  }) {
    const { rfidUID, scanType, location } = body;

    console.log(`📇 RFID Scan Request: ${rfidUID} at ${location || 'unknown'}`);

    try {
      // Find pig by RFID
      let pig = await this.pigService.findByRFID(rfidUID);

      if (!pig) {
        // Auto-register new pig if not found
        console.log(`🐷 New pig detected, auto-registering: ${rfidUID}`);
        pig = await this.pigService.create(
          rfidUID,
          `Pig-${rfidUID.substring(0, 6)}`, // Default name
          `Auto-registered from ${scanType || 'scan'} at ${location || 'unknown'}`
        );
      }

      // Update last scanned time
      await this.pigService.updateLastScanned(pig.id);

      console.log(`✅ Pig identified: ${pig.pigName} (ID: ${pig.id})`);

      return {
        success: true,
        pigId: pig.id,
        pigName: pig.pigName,
        rfidUID: rfidUID,
        lastScanned: pig.lastScanned,
        registeredDate: pig.registeredDate,
        message: 'Pig identified',
      };
    } catch (error) {
      console.error('❌ RFID scan error:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process RFID scan',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Your other endpoints...
  @Get()
  async getAllPigs() {
    return this.pigService.getAllPigsWithLatestTemp();
  }
}