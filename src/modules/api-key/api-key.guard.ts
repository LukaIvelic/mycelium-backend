import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRateLimiterService } from './cache/api-key-rate-limiter.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimiter: ApiKeyRateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      this.logger.warn(
        `Rejected ${request.method} ${request.url}: missing x-api-key header`,
      );
      throw new UnauthorizedException();
    }

    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    if (await this.rateLimiter.isRateLimited(hash)) {
      this.logger.warn(
        `Rejected ${request.method} ${request.url}: rate limit exceeded for key ${keyPrefix}...`,
      );
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const apiKey = await this.apiKeyService.validateApiKey(rawKey);
    if (!apiKey) {
      this.logger.warn(
        `Rejected ${request.method} ${request.url}: invalid or revoked api key ${keyPrefix}...`,
      );
      throw new UnauthorizedException();
    }

    request['apiKey'] = apiKey;
    return true;
  }

  private extractKey(request: Request): string | undefined {
    return request.headers['x-api-key'] as string | undefined;
  }
}
