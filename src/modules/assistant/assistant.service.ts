import { Injectable } from '@nestjs/common';
import type { AssistantChatResponse } from './assistant.dto';
import type { AssistantCompletionRequest } from './assistant.types';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

@Injectable()
export class AssistantService {
  constructor(private readonly provider: OpenAiAssistantProvider) {}

  chat(request: AssistantCompletionRequest): Promise<AssistantChatResponse> {
    return this.provider.createCompletion(this.normalize(request));
  }

  streamChat(
    request: AssistantCompletionRequest,
    onDelta: (delta: string) => void,
  ): Promise<AssistantChatResponse> {
    return this.provider.streamCompletion(this.normalize(request), onDelta);
  }

  private normalize(
    request: AssistantCompletionRequest,
  ): AssistantCompletionRequest {
    return {
      ...request,
      messages: request.messages.map((message) => ({
        ...message,
        content: message.content.trim(),
      })),
    };
  }
}
