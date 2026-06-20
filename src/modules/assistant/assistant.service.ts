import { Injectable } from '@nestjs/common';
import type { AssistantChatResponse } from './assistant.dto';
import type { AssistantCompletionRequest } from './assistant.types';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

@Injectable()
export class AssistantService {
  constructor(private readonly provider: OpenAiAssistantProvider) {}

  chat(request: AssistantCompletionRequest): Promise<AssistantChatResponse> {
    return this.provider.createCompletion({
      ...request,
      messages: request.messages.map((message) => ({
        ...message,
        content: message.content.trim(),
      })),
    });
  }
}
