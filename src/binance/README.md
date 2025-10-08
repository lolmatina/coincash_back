# Binance API Service

This service provides public endpoints to fetch cryptocurrency market data from Binance API with RAM caching for improved performance.

## Features

- **RAM Caching**: All API responses are cached in memory for 30 seconds to reduce external API calls
- **Frontend-Only Access**: Endpoints are protected by a guard that only allows requests from frontend applications
- **Real-time Data**: Fetches live cryptocurrency prices, trading pairs, and market data
- **Popular Cryptocurrencies**: Focuses on major trading pairs (BTC, ETH, LTC, BCH, etc.)

## API Endpoints

All endpoints are prefixed with `/api/binance` and require frontend-only access.

### Market Data Endpoints

#### GET `/api/binance/trading-pairs`
Returns all USDT trading pairs with 24h statistics.

**Response:**
```json
[
  {
    "symbol": "BTCUSDT",
    "price": "107114.87",
    "priceChange": "2643.45",
    "priceChangePercent": "2.53",
    "lastPrice": "107114.87",
    "volume": "12345.67",
    "openTime": 1640995200000,
    "closeTime": 1641081600000
  }
]
```

#### GET `/api/binance/popular-pairs`
Returns popular cryptocurrency trading pairs (BTC, ETH, LTC, BCH, ADA, DOT, LINK, UNI).

#### GET `/api/binance/trading-pair/:symbol`
Returns detailed information for a specific trading pair.

**Parameters:**
- `symbol`: Trading pair symbol (e.g., BTCUSDT)

#### GET `/api/binance/price/:symbol`
Returns current price for a specific cryptocurrency.

**Parameters:**
- `symbol`: Trading pair symbol (e.g., BTCUSDT)

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "price": "107114.87",
  "time": 1641081600000
}
```

#### GET `/api/binance/kline/:symbol`
Returns candlestick/kline data for price charts.

**Parameters:**
- `symbol`: Trading pair symbol (e.g., BTCUSDT)
- `interval`: Time interval (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
- `limit`: Number of data points (default: 24)

### Frontend-Specific Endpoints

#### GET `/api/binance/market-data`
Returns formatted market data for frontend display.

**Response:**
```json
{
  "pairs": [...],
  "timestamp": 1641081600000
}
```

#### GET `/api/binance/crypto-cards`
Returns data formatted for cryptocurrency cards display (like in the images).

**Response:**
```json
{
  "cards": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": "107114.87",
      "change": "2643.45",
      "changePercent": "2.53",
      "trend": "up"
    }
  ],
  "timestamp": 1641081600000
}
```

#### GET `/api/binance/exchange-data`
Returns data formatted for exchange/trading interface display.

**Response:**
```json
{
  "tradingPairs": [
    {
      "symbol": "BTCUSDT",
      "price": "107114.87",
      "change24h": "2643.45",
      "changePercent24h": "2.53",
      "trend": "up"
    }
  ],
  "timestamp": 1641081600000
}
```

## Security

- **Frontend-Only Guard**: Only allows requests from frontend applications
- **Origin Validation**: Checks request origin and referer headers
- **Bot Protection**: Blocks requests from known bots and API testing tools
- **Development Support**: Allows localhost requests for development

## Caching

- **Cache Duration**: 30 seconds for all endpoints
- **Cache Keys**: Unique keys per endpoint and parameters
- **Memory Storage**: Uses NestJS Cache Manager with in-memory storage
- **Automatic Invalidation**: Cache expires automatically after TTL

## Usage Examples

### Frontend Integration

```typescript
// Fetch crypto cards data
const response = await fetch('/api/binance/crypto-cards');
const data = await response.json();

// Fetch exchange data
const exchangeData = await fetch('/api/binance/exchange-data');
const exchange = await exchangeData.json();

// Fetch specific trading pair
const btcData = await fetch('/api/binance/trading-pair/BTCUSDT');
const btc = await btcData.json();
```

### Error Handling

The service includes comprehensive error handling:
- Network errors from Binance API
- Invalid symbol errors
- Cache errors
- Frontend access violations

All errors are logged and appropriate HTTP status codes are returned.

## Configuration

The service uses the following configuration:
- **Binance Base URL**: `https://api.binance.com/api/v3`
- **Cache TTL**: 30 seconds
- **Popular Symbols**: BTC, ETH, LTC, BCH, ADA, DOT, LINK, UNI

## Dependencies

- `@nestjs/cache-manager`: For RAM caching
- `axios`: For HTTP requests to Binance API
- `class-validator`: For request validation

