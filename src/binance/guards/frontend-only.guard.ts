import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class FrontendOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const userAgent = request.headers['user-agent'];

    // Allow requests from localhost (development)
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return true;
    }

    // Allow requests from your frontend domains
    const allowedOrigins = [
      'https://your-frontend-domain.com',
      'https://coincash-front.vercel.app',
      'https://auth-front.vercel.app',
      'https://coincash.com',
      'https://www.coincash.com',
      // Add your actual deployed frontend domain here
    ];

    if (origin && allowedOrigins.some(allowedOrigin => origin.includes(allowedOrigin))) {
      return true;
    }

    // Allow requests with frontend referer
    if (referer && (
      referer.includes('localhost') || 
      referer.includes('127.0.0.1') ||
      allowedOrigins.some(allowedOrigin => referer.includes(allowedOrigin))
    )) {
      return true;
    }

    // Block requests that look like direct API calls or bots
    if (userAgent && (
      userAgent.includes('curl') ||
      userAgent.includes('wget') ||
      userAgent.includes('Postman') ||
      userAgent.includes('insomnia') ||
      userAgent.includes('bot') ||
      userAgent.includes('crawler')
    )) {
      throw new ForbiddenException('Access denied: This endpoint is only available for frontend applications');
    }

    // For development, allow requests without origin/referer
    if (!origin && !referer) {
      return true;
    }

    // In production, be more permissive for Binance API endpoints
    // since they're public market data - allow most requests
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // Only block obvious bots/crawlers, allow everything else
      if (!userAgent || !(
        userAgent.includes('curl') ||
        userAgent.includes('wget') ||
        userAgent.includes('Postman') ||
        userAgent.includes('insomnia') ||
        userAgent.includes('bot') ||
        userAgent.includes('crawler')
      )) {
        return true;
      }
    }

    throw new ForbiddenException('Access denied: This endpoint is only available for frontend applications');
  }
}

