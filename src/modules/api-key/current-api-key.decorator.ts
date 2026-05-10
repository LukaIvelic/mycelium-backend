import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiKey } from '@/database';

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request['apiKey'] as ApiKey;
  },
);
