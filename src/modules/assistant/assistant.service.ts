import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import type { AssistantChatResponse } from './assistant.dto';
import type {
  AssistantAccount,
  AssistantCompletionRequest,
} from './assistant.types';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly provider: OpenAiAssistantProvider,
    private readonly userService: UserService,
  ) {}

  async chat(
    request: AssistantCompletionRequest,
  ): Promise<AssistantChatResponse> {
    return this.provider.createCompletion(await this.prepare(request));
  }

  async streamChat(
    request: AssistantCompletionRequest,
    onDelta: (delta: string) => void,
  ): Promise<AssistantChatResponse> {
    return this.provider.streamCompletion(await this.prepare(request), onDelta);
  }

  private async prepare(
    request: AssistantCompletionRequest,
  ): Promise<AssistantCompletionRequest> {
    return {
      ...this.normalize(request),
      account: await this.loadAccount(request.userId),
    };
  }

  /**
   * Resolves the signed-in user's account from the authenticated id so the
   * assistant can personalize replies. Identity comes from the JWT, never the
   * request body. A lookup failure must not break the chat, so it is logged
   * and the assistant simply runs without account context.
   */
  private async loadAccount(
    userId: string,
  ): Promise<AssistantAccount | undefined> {
    try {
      const user = await this.userService.findOne(userId);
      return { email: user.email, id: user.id };
    } catch (error) {
      this.logger.warn(
        `Assistant account lookup failed for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return undefined;
    }
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
