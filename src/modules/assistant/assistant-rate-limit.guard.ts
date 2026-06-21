import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Errors } from '@/lib/constants/errors';
import { AssistantRateLimiterService } from './assistant-rate-limiter.service';

type AssistantRateLimitRequest = FastifyRequest & {
  user?: {
    sub?: string;
  };
};

@Injectable()
export class AssistantRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiter: AssistantRateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AssistantRateLimitRequest>();
    const userId = request.user?.sub;
    const key = userId ?? request.ip ?? 'unknown';

    if (await this.rateLimiter.isRateLimited(key)) {
      throw new HttpException(
        Errors.Assistant.RateLimited,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
