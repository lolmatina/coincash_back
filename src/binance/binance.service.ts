import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import axios from 'axios';

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
  private readonly BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly cacheKeys = new Set<string>();
  private binanceBlocked = false;

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

      // Fetch from Binance API
      const response = await axios.get(`${this.BINANCE_BASE_URL}/ticker/24hr`);
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
      
      // Handle specific error codes
      if (error.response?.status === 451) {
        this.logger.warn('Binance API blocked (451) - likely geographic restriction');
        this.binanceBlocked = true;
        this.logger.log('Falling back to CoinGecko API');
        return this.getTradingPairsFromCoinGecko();
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

      // Fetch from Binance API
      const response = await axios.get(`${this.BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`);
      const data: TradingPair = response.data;

      // Cache the data
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.cacheKeys.add(cacheKey);
      
      this.logger.log(`Fetched trading pair data for ${symbol} from Binance API`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching trading pair ${symbol}:`, error.message);
      
      // Handle specific error codes
      if (error.response?.status === 451) {
        this.logger.warn(`Binance API blocked (451) for ${symbol} - likely geographic restriction`);
        return null;
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

      // Fetch from Binance API
      const response = await axios.get(`${this.BINANCE_BASE_URL}/ticker/price?symbol=${symbol}`);
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

      // Fetch from Binance API
      const response = await axios.get(`${this.BINANCE_BASE_URL}/klines`, {
        params: {
          symbol,
          interval,
          limit,
        },
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

  // Fallback method using CoinGecko API
  private async getTradingPairsFromCoinGecko(): Promise<TradingPair[]> {
    try {
      this.logger.log('Fetching trading pairs from CoinGecko API');
      
      const response = await axios.get(`${this.COINGECKO_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 50,
          page: 1,
          sparkline: false,
        },
      });

      const pairs: TradingPair[] = response.data.map((coin: any) => ({
        symbol: `${coin.symbol.toUpperCase()}USDT`,
        price: coin.current_price?.toString() || '0',
        priceChange: coin.price_change_24h?.toString() || '0',
        priceChangePercent: coin.price_change_percentage_24h?.toString() || '0',
        weightedAvgPrice: coin.current_price?.toString() || '0',
        prevClosePrice: (coin.current_price - coin.price_change_24h)?.toString() || '0',
        lastPrice: coin.current_price?.toString() || '0',
        lastQty: '0',
        bidPrice: coin.current_price?.toString() || '0',
        askPrice: coin.current_price?.toString() || '0',
        openPrice: (coin.current_price - coin.price_change_24h)?.toString() || '0',
        highPrice: coin.high_24h?.toString() || '0',
        lowPrice: coin.low_24h?.toString() || '0',
        volume: coin.total_volume?.toString() || '0',
        quoteVolume: coin.total_volume?.toString() || '0',
        openTime: Date.now() - 86400000, // 24 hours ago
        closeTime: Date.now(),
        firstId: 0,
        lastId: 0,
        count: 0,
      }));

      this.logger.log(`Fetched ${pairs.length} trading pairs from CoinGecko API`);
      return pairs;
    } catch (error) {
      this.logger.error('Error fetching trading pairs from CoinGecko:', error.message);
      throw new Error('Failed to fetch trading pairs from both Binance and CoinGecko');
    }
  }
}
