import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from './pig.entity';
import { PigService } from './pig.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pig])],
  providers: [PigService],
  exports: [PigService],
})
export class PigModule {}