import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '', // your MySQL password if any
      database: 'agricooldb', // your database name
      entities: [User],
      synchronize: true, // automatically creates the table if not exists
    }),
    UsersModule,
  ],
})
export class AppModule {}
