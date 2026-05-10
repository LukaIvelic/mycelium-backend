import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProjectService } from '@/modules/project/project.service';

@Injectable()
export class ProjectOwnershipGuard implements CanActivate {
  constructor(private readonly projectService: ProjectService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request['user'] as { sub: string }).sub;
    const projectId = (request.params as { id: string }).id;

    const project = await this.projectService.findOne(projectId, userId);
    request['project'] = project;

    return true;
  }
}
