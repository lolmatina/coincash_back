import { Controller, Get, Param, Query, UseGuards, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { BinanceService, TradingPair, PriceData, KlineData } from './binance.service';
import { FrontendOnlyGuard } from './guards/frontend-only.guard';
import { GetKlineDataDto, GetTradingPairDto, GetPriceDto } from './dto/binance.dto';

@Controller('api/binance')
@UseGuards(FrontendOnlyGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class BinanceController {
  private readonly logger = new Logger(BinanceController.name);

  constructor(private readonly binanceService: BinanceService) {}

  @Get('trading-pairs')
  async getTradingPairs(): Promise<TradingPair[]> {
    this.logger.log('Fetching all trading pairs');
    return this.binanceService.getTradingPairs();
  }

  @Get('popular-pairs')
  async getPopularPairs(): Promise<TradingPair[]> {
    this.logger.log('Fetching popular trading pairs');
    return this.binanceService.getPopularPairs();
  }

  @Get('trading-pair/:symbol')
  async getTradingPair(@Param('symbol') symbol: string): Promise<TradingPair | null> {
    this.logger.log(`Fetching trading pair: ${symbol}`);
    return this.binanceService.getTradingPair(symbol.toUpperCase());
  }

  @Get('price/:symbol')
  async getPrice(@Param('symbol') symbol: string): Promise<PriceData | null> {
    this.logger.log(`Fetching price for: ${symbol}`);
    return this.binanceService.getPrice(symbol.toUpperCase());
  }

  @Get('kline/:symbol')
  async getKlineData(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string = '1h',
    @Query('limit') limit: string = '24',
  ): Promise<KlineData[]> {
    this.logger.log(`Fetching kline data for: ${symbol}, interval: ${interval}, limit: ${limit}`);
    return this.binanceService.getKlineData(
      symbol.toUpperCase(),
      interval,
      parseInt(limit, 10),
    );
  }

  @Get('market-data')
  async getMarketData(): Promise<{
    pairs: TradingPair[];
    timestamp: number;
  }> {
    this.logger.log('Fetching market data');
    const pairs = await this.binanceService.getPopularPairs();
    return {
      pairs,
      timestamp: Date.now(),
    };
  }

  @Get('health')
  async healthCheck(): Promise<{
    status: string;
    timestamp: number;
    binanceApiStatus: string;
    coingeckoApiStatus: string;
    error?: string;
  }> {
    this.logger.log('Binance service health check');
    try {
      // Test Binance API connectivity
      const testPair = await this.binanceService.getTradingPair('BTCUSDT');
      return {
        status: 'healthy',
        timestamp: Date.now(),
        binanceApiStatus: testPair ? 'connected' : 'disconnected',
        coingeckoApiStatus: 'not_tested',
      };
    } catch (error) {
      this.logger.error('Binance API health check failed:', error.message);
      
      // Check if it's a 451 error
      const is451Error = error.message.includes('451') || error.message.includes('geographic restriction');
      
      return {
        status: is451Error ? 'blocked' : 'unhealthy',
        timestamp: Date.now(),
        binanceApiStatus: is451Error ? 'blocked_451' : 'error',
        coingeckoApiStatus: 'fallback_available',
        error: error.message,
      };
    }
  }

  @Get('crypto-cards')
  async getCryptoCards(): Promise<{
    cards: Array<{
      symbol: string;
      name: string;
      price: string;
      change: string;
      changePercent: string;
      trend: 'up' | 'down';
    }>;
    timestamp: number;
  }> {
    this.logger.log('Fetching crypto cards data');
    const pairs = await this.binanceService.getPopularPairs();
    
    const cards = pairs.slice(0, 4).map(pair => ({
      symbol: pair.symbol.replace('USDT', ''),
      name: this.getCryptoName(pair.symbol),
      price: parseFloat(pair.lastPrice).toFixed(2),
      change: parseFloat(pair.priceChange).toFixed(2),
      changePercent: parseFloat(pair.priceChangePercent).toFixed(2),
      trend: parseFloat(pair.priceChangePercent) >= 0 ? 'up' as const : 'down' as const,
    }));

    return {
      cards,
      timestamp: Date.now(),
    };
  }

  @Get('exchange-data')
  async getExchangeData(): Promise<{
    tradingPairs: Array<{
      symbol: string;
      price: string;
      change24h: string;
      changePercent24h: string;
      trend: 'up' | 'down';
    }>;
    timestamp: number;
  }> {
    this.logger.log('Fetching exchange data');
    const pairs = await this.binanceService.getPopularPairs();
    
    const tradingPairs = pairs.map(pair => ({
      symbol: pair.symbol,
      price: parseFloat(pair.lastPrice).toFixed(2),
      change24h: parseFloat(pair.priceChange).toFixed(2),
      changePercent24h: parseFloat(pair.priceChangePercent).toFixed(2),
      trend: parseFloat(pair.priceChangePercent) >= 0 ? 'up' as const : 'down' as const,
    }));

    return {
      tradingPairs,
      timestamp: Date.now(),
    };
  }

  private getCryptoName(symbol: string): string {
    const cryptoNames: { [key: string]: string } = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'LTCUSDT': 'Litecoin',
      'BCHUSDT': 'Bitcoin Cash',
      'ADAUSDT': 'Cardano',
      'DOTUSDT': 'Polkadot',
      'LINKUSDT': 'Chainlink',
      'UNIUSDT': 'Uniswap',
    };
    
    return cryptoNames[symbol] || symbol.replace('USDT', '');
  }
}
