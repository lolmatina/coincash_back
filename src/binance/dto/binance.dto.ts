import { IsString, IsOptional, IsNumberString, IsIn } from 'class-validator';

export class GetKlineDataDto {
  @IsString()
  symbol: string;

  @IsOptional()
  @IsIn(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'])
  interval?: string = '1h';

  @IsOptional()
  @IsNumberString()
  limit?: string = '24';
}

export class GetTradingPairDto {
  @IsString()
  symbol: string;
}

export class GetPriceDto {
  @IsString()
  symbol: string;
}

