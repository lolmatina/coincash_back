import { Module } from '@nestjs/common';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';
import { FrontendOnlyGuard } from './guards/frontend-only.guard';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register()],
  controllers: [BinanceController],
  providers: [BinanceService, FrontendOnlyGuard],
  exports: [BinanceService],
})
export class BinanceModule {}
