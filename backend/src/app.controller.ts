import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { Repository } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    try {
      await this.userRepository.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch (err) {
      return { status: 'error', db: 'not connected', error: err.message };
    }
  }
}
