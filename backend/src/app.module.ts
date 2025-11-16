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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '', // your MySQL password if any
      database: 'agricooldb', // your database name
      entities: [User, Sensor, MistingLog, Notification],
      synchronize: true, // automatically creates the table if not exists
    }),
    UsersModule,
    SensorsModule,
    MistingModule,
    NotificationModule,
  ],
})
export class AppModule {}