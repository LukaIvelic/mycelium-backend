import { applyDecorators, Post, UseGuards } from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { AssistantChatResponse } from './assistant.dto';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard';

export function ApiAssistantChat() {
  return applyDecorators(
    Post('chat'),
    UseGuards(JwtGuard, AssistantRateLimitGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Send a message to the AI assistant' }),
    ApiResponse({
      status: 201,
      description: 'Assistant response generated',
      type: AssistantChatResponse,
    }),
    ApiResponse({ status: 429, description: 'Too many assistant requests' }),
    ApiResponse({
      status: 503,
      description: 'OpenAI API key is not configured',
    }),
  );
}
