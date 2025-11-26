import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'agricooldb',
      entities: [User, Sensor, MistingLog, Notification, ThermalRecord],
      synchronize: true,
    }),
    UsersModule,
    SensorsModule,
    MistingModule,
    NotificationModule,
    ThermalRecordModule,
  ],
})
export class AppModule {}