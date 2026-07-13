import {
  BadGatewayException,
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { MyceliumInformation } from '@/lib/constants/mycelium-app-information';
import { ApiAssistantChat } from './assistant.decorator';
import { AssistantChatDto, type AssistantChatResponse } from './assistant.dto';
import { AssistantService } from './assistant.service';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard';

interface AssistantStreamError {
  code: 'missing_key' | 'provider' | 'unknown';
  message: string;
}

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  private readonly logger = new Logger(AssistantController.name);

  constructor(private readonly assistantService: AssistantService) {}

  @ApiAssistantChat()
  chat(
    @CurrentUser() userId: string,
    @Body() dto: AssistantChatDto,
  ): Promise<AssistantChatResponse> {
    return this.assistantService.chat({
      messages: dto.messages,
      model: dto.model,
      projectId: dto.projectId,
      thinking: dto.thinking,
      userId,
    });
  }

  @Post('chat/stream')
  @UseGuards(JwtGuard, AssistantRateLimitGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Stream a message from the AI assistant (SSE)' })
  async chatStream(
    @CurrentUser() userId: string,
    @Body() dto: AssistantChatDto,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Hijacking the reply bypasses Fastify's onSend hooks, so the CORS headers
    // that the global config would normally add are set manually here.
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    };
    const origin = request.headers.origin;
    if (origin && MyceliumInformation.allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers.Vary = 'Origin';
    }

    reply.hijack();
    reply.raw.writeHead(200, headers);

    const write = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this.assistantService.streamChat(
        {
          messages: dto.messages,
          model: dto.model,
          projectId: dto.projectId,
          thinking: dto.thinking,
          userId,
        },
        (delta) => write('delta', { content: delta }),
      );
      write('done', { model: result.model, usage: result.usage });
    } catch (error) {
      this.logger.error(
        `Assistant stream failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      write('error', this.toStreamError(error));
    } finally {
      reply.raw.end();
    }
  }

  private toStreamError(error: unknown): AssistantStreamError {
    if (error instanceof ServiceUnavailableException) {
      return { code: 'missing_key', message: error.message };
    }
    if (error instanceof BadGatewayException) {
      return { code: 'provider', message: error.message };
    }
    return { code: 'unknown', message: 'Assistant request failed.' };
  }
}
