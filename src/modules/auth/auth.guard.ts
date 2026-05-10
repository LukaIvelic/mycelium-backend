import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RateLimiterService } from '@/common/rate-limit/rate-limiter.service';
import { Errors } from '@/lib/constants/errors';

@Injectable()
export class ValidateUserRateLimitGuard implements CanActivate {
  constructor(
    @Inject('AUTH_RATE_LIMITER')
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const ip = request.ip ?? 'unknown';
    if (await this.rateLimiter.isRateLimited(ip)) {
      throw new HttpException(
        Errors.ApiKey.RateLimited,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
