import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import axios from 'axios';
import https from 'https';

export interface TradingPair {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface PriceData {
  symbol: string;
  price: string;
  time: number;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private readonly BINANCE_BASE_URL = 'https://proxy.coincash.biz.kg';
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly cacheKeys = new Set<string>();
  private readonly axiosConfig = {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // Allow self-signed certificates
    }),
    timeout: 10000,
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getTradingPairs(): Promise<TradingPair[]> {
    const cacheKey = 'binance:trading-pairs';
    
    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<TradingPair[]>(cacheKey);
      if (cachedData) {
        this.logger.log('Returning cached trading pairs data');
        return cachedData;
      }

      // Fetch from Binance API via proxy
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'api/v3/ticker/24hr'
        },
        ...this.axiosConfig
      });
      const data: TradingPair[] = response.data;

      // Filter for USDT pairs only
      const usdtPairs = data.filter(pair => pair.symbol.endsWith('USDT'));

      // Cache the data
      await this.cacheManager.set(cacheKey, usdtPairs, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched ${usdtPairs.length} trading pairs from Binance API`);
      return usdtPairs;
    } catch (error) {
      this.logger.error('Error fetching trading pairs:', error.message);
      throw new Error('Failed to fetch trading pairs from Binance');
    }
  }

  async getTradingPair(symbol: string): Promise<TradingPair | null> {
    const cacheKey = `binance:trading-pair:${symbol}`;
    
    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<TradingPair>(cacheKey);
      if (cachedData) {
        this.logger.log(`Returning cached data for ${symbol}`);
        return cachedData;
      }

      // Fetch from Binance API via proxy
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'api/v3/ticker/24hr',
          symbol: symbol
        },
        ...this.axiosConfig
      });
      const data: TradingPair = response.data;

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched trading pair data for ${symbol} from Binance API`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching trading pair ${symbol}:`, error.message);
      return null;
    }
  }

  async getPrice(symbol: string): Promise<PriceData | null> {
    const cacheKey = `binance:price:${symbol}`;
    
    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<PriceData>(cacheKey);
      if (cachedData) {
        this.logger.log(`Returning cached price for ${symbol}`);
        return cachedData;
      }

      // Fetch from Binance API via proxy
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'api/v3/ticker/price',
          symbol: symbol
        },
        ...this.axiosConfig
      });
      const data: PriceData = response.data;

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched price for ${symbol} from Binance API`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching price for ${symbol}:`, error.message);
      return null;
    }
  }

  async getKlineData(symbol: string, interval: string = '1h', limit: number = 24): Promise<KlineData[]> {
    const cacheKey = `binance:kline:${symbol}:${interval}:${limit}`;
    
    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<KlineData[]>(cacheKey);
      if (cachedData) {
        this.logger.log(`Returning cached kline data for ${symbol}`);
        return cachedData;
      }

      // Fetch from Binance API via proxy
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'api/v3/klines',
          symbol,
          interval,
          limit,
        },
        ...this.axiosConfig
      });
      
      const data: KlineData[] = response.data.map((kline: any[]) => ({
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6],
        quoteAssetVolume: kline[7],
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: kline[9],
        takerBuyQuoteAssetVolume: kline[10],
        ignore: kline[11],
      }));

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched kline data for ${symbol} from Binance API`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching kline data for ${symbol}:`, error.message);
      return [];
    }
  }

  async getPopularPairs(): Promise<TradingPair[]> {
    const popularSymbols = ['BTCUSDT', 'ETHUSDT', 'LTCUSDT', 'BCHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'UNIUSDT'];
    const pairs: TradingPair[] = [];

    for (const symbol of popularSymbols) {
      const pair = await this.getTradingPair(symbol);
      if (pair) {
        pairs.push(pair);
      }
    }

    return pairs;
  }

  async clearCache(): Promise<void> {
    try {
      // Clear all tracked cache keys
      for (const key of this.cacheKeys) {
        await this.cacheManager.del(key);
      }
      this.cacheKeys.clear();
      this.logger.log('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache:', error.message);
    }
  }

}
