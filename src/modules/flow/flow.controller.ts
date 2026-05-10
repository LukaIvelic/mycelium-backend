import { Controller, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ProjectService } from '../project/project.service';
import { ApiGetFlow } from './flow.decorator';
import type { FlowDto } from './flow.dto';
import { FlowService } from './flow.service';

@ApiTags('flows')
@Controller('flows')
export class FlowController {
  constructor(
    private readonly flowService: FlowService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiGetFlow()
  async findByProjectId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() userId: string,
  ): Promise<FlowDto> {
    await this.projectService.findOne(projectId, userId);
    await this.flowService.syncProjectFlow(projectId);
    return this.flowService.findByProjectId(projectId);
  }
}
