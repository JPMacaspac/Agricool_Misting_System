import { Controller, Get } from '@nestjs/common';

@Controller('sensors')
export class SensorsController {
  // Local-only: No Firebase code needed

  @Get('data')
  async getData() {
    // TODO: Implement local sensor data retrieval from MySQL
    return { message: 'Local sensor data endpoint. Connect Arduino/ESP32 to backend.' };
  }
}
