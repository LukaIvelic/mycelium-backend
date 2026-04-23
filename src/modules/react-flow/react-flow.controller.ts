import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwt.guard';
import { ProjectService } from '../project/project.service';
import { ReactFlowDto } from './react-flow.dto';
import { ReactFlowService } from './react-flow.service';

@ApiTags('react-flow')
@Controller('react-flow')
export class ReactFlowController {
  constructor(
    private readonly reactFlowService: ReactFlowService,
    private readonly projectService: ProjectService,
  ) {}

  @Get(':projectId')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Get or create a React Flow graph for a project' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() request: Request,
  ): Promise<ReactFlowDto> {
    const { sub } = request['user'] as { sub: string };
    await this.projectService.assertUserOwnsProject(projectId, sub);
    await this.reactFlowService.syncProjectGraph(projectId);
    return this.reactFlowService.findByProject(projectId);
  }
}
