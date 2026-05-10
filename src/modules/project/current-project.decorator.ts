import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Project } from '@/database';

export const CurrentProject = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Project => {
    const request = ctx.switchToHttp().getRequest();
    return request.project as Project;
  },
);
