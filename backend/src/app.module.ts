import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';  // ✅ ADD THIS
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { SensorsModule } from './sensors/sensors.module';
import { Sensor } from './sensors/sensors.entity';
import { MistingModule } from './misting/misting.module';
import { MistingLog } from './misting/misting-log.entity';
import { NotificationModule } from './notifications/notification.module';
import { Notification } from './notifications/notification.entity';
import { ThermalRecordModule } from './thermal-records/thermal-record.module';
import { ThermalRecord } from './thermal-records/thermal-record.entity';
import { PigModule } from './pigs/pig.module';
import { Pig } from './pigs/pig.entity';

@Module({
  imports: [
    // ✅ ADD ConfigModule to load .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // ✅ UPDATED: Now uses environment variables
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'agricooldb',
      entities: [User, Sensor, MistingLog, Notification, ThermalRecord, Pig],
      synchronize: true,
      autoLoadEntities: true,  // ✅ ADD THIS - automatically loads entities
    }),
    UsersModule,
    SensorsModule,
    MistingModule,
    NotificationModule,
    ThermalRecordModule,
    PigModule,
  ],
})
export class AppModule {}