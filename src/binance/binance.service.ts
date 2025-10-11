import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import axios from 'axios';
import * as https from 'https';

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
      this.logger.log('Fetching trading pairs from Binance API via proxy');
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'ticker/24hr'
        },
        ...this.axiosConfig
      });
      
      this.logger.log(`Proxy response status: ${response.status}`);
      
      // Validate response data
      if (!response.data || !Array.isArray(response.data)) {
        this.logger.error('Invalid response data from proxy:', response.data);
        throw new Error('Invalid response format from proxy');
      }
      
      const data: TradingPair[] = response.data;

      // Filter for USDT pairs only and validate each pair
      const usdtPairs = data.filter(pair => {
        if (!pair || typeof pair !== 'object') {
          this.logger.warn('Invalid pair object:', pair);
          return false;
        }
        return pair.symbol && pair.symbol.endsWith('USDT');
      });

      // Cache the data
      await this.cacheManager.set(cacheKey, usdtPairs, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched ${usdtPairs.length} trading pairs from Binance API via proxy`);
      return usdtPairs;
    } catch (error) {
      this.logger.error('Error fetching trading pairs:', error.message);
      if (error.response) {
        this.logger.error('Proxy response error:', error.response.status, error.response.data);
      }
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
      this.logger.log(`Fetching trading pair data for ${symbol} from Binance API via proxy`);
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'ticker/24hr',
          symbol: symbol
        },
        ...this.axiosConfig
      });
      
      this.logger.log(`Proxy response status for ${symbol}: ${response.status}`);
      
      // Validate response data
      if (!response.data || typeof response.data !== 'object') {
        this.logger.error(`Invalid response data for ${symbol}:`, response.data);
        return null;
      }
      
      const data: TradingPair = response.data;

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched trading pair data for ${symbol} from Binance API via proxy`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching trading pair ${symbol}:`, error.message);
      if (error.response) {
        this.logger.error(`Proxy response error for ${symbol}:`, error.response.status, error.response.data);
      }
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
      this.logger.log(`Fetching price for ${symbol} from Binance API via proxy`);
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'ticker/price',
          symbol: symbol
        },
        ...this.axiosConfig
      });
      
      this.logger.log(`Proxy response status for ${symbol} price: ${response.status}`);
      
      // Validate response data
      if (!response.data || typeof response.data !== 'object') {
        this.logger.error(`Invalid price response data for ${symbol}:`, response.data);
        return null;
      }
      
      const data: PriceData = response.data;

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched price for ${symbol} from Binance API via proxy`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching price for ${symbol}:`, error.message);
      if (error.response) {
        this.logger.error(`Proxy response error for ${symbol} price:`, error.response.status, error.response.data);
      }
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
      this.logger.log(`Fetching kline data for ${symbol} from Binance API via proxy`);
      const response = await axios.get(`${this.BINANCE_BASE_URL}`, {
        params: {
          path: 'klines',
          symbol,
          interval,
          limit,
        },
        ...this.axiosConfig
      });
      
      this.logger.log(`Proxy response status for ${symbol} klines: ${response.status}`);
      
      // Validate response data
      if (!response.data || !Array.isArray(response.data)) {
        this.logger.error(`Invalid kline response data for ${symbol}:`, response.data);
        return [];
      }
      
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
      
      this.logger.log(`Fetched kline data for ${symbol} from Binance API via proxy`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching kline data for ${symbol}:`, error.message);
      if (error.response) {
        this.logger.error(`Proxy response error for ${symbol} klines:`, error.response.status, error.response.data);
      }
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
