import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthRateLimiterService } from './cache/auth-rate-limiter.service';

@Injectable()
export class ValidateUserRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiter: AuthRateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const ip = request.ip ?? 'unknown';
    if (await this.rateLimiter.isRateLimited(ip)) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
