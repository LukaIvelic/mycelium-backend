import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRateLimiterService } from './cache/api-key-rate-limiter.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimiter: ApiKeyRateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = this.extractKey(request);
    if (!rawKey) throw new UnauthorizedException();

    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    if (await this.rateLimiter.isRateLimited(hash))
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const apiKey = await this.apiKeyService.validateApiKey(rawKey);
    if (!apiKey) throw new UnauthorizedException();

    request['apiKey'] = apiKey;
    return true;
  }

  private extractKey(request: Request): string | undefined {
    return request.headers['x-api-key'] as string | undefined;
  }
}
