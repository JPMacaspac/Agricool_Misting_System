import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from './pig.entity';
import { PigService } from './pig.service';
import { PigController } from './pigs.controller';  // ✅ ADD THIS

@Module({
  imports: [TypeOrmModule.forFeature([Pig])],
  controllers: [PigController],  // ✅ ADD THIS LINE
  providers: [PigService],
  exports: [PigService],
})
export class PigModule {}