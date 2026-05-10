import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';

export class FlowResponse {
  @ApiProperty({ example: [] })
  nodes!: unknown;

  @ApiProperty({ example: [] })
  edges!: unknown;
}

export function ApiGetFlow() {
  return applyDecorators(
    Get(':projectId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get or create a flow graph for a project' }),
    ApiParam({ name: 'projectId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Flow found',
      type: FlowResponse,
    }),
    ApiResponse({ status: 404, description: 'Project or flow not found' }),
  );
}
