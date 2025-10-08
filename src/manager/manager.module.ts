import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';

@Module({
  imports: [],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}


