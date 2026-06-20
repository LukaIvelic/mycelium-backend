import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Errors } from '@/lib/constants/errors';
import {
  ASSISTANT_DEFAULT_BASE_URL,
  ASSISTANT_DEFAULT_MAX_OUTPUT_TOKENS,
  ASSISTANT_DEFAULT_MODEL,
  ASSISTANT_DEFAULT_SYSTEM_PROMPT,
  parsePositiveInteger,
} from './assistant.config';
import type { AssistantChatResponse } from './assistant.dto';
import type {
  AssistantCompletionRequest,
  AssistantProvider,
  OpenAiResponseBody,
} from './assistant.types';

@Injectable()
export class OpenAiAssistantProvider implements AssistantProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly maxOutputTokens: number;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY');
    this.baseUrl =
      config.get<string>('OPENAI_BASE_URL') ?? ASSISTANT_DEFAULT_BASE_URL;
    this.model = config.get<string>('OPENAI_MODEL') ?? ASSISTANT_DEFAULT_MODEL;
    this.systemPrompt =
      config.get<string>('ASSISTANT_SYSTEM_PROMPT') ??
      ASSISTANT_DEFAULT_SYSTEM_PROMPT;
    this.maxOutputTokens = parsePositiveInteger(
      config.get<string>('ASSISTANT_MAX_OUTPUT_TOKENS'),
      ASSISTANT_DEFAULT_MAX_OUTPUT_TOKENS,
    );
  }

  async createCompletion(
    request: AssistantCompletionRequest,
  ): Promise<AssistantChatResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        Errors.Assistant.MissingOpenAiApiKey,
      );
    }

    const response = await fetch(this.responsesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        instructions: this.systemPrompt,
        max_output_tokens: this.maxOutputTokens,
        model: this.model,
        safety_identifier: request.userId,
        store: false,
        ...(request.projectId && {
          metadata: {
            project_id: request.projectId,
          },
        }),
      }),
    });

    const body = (await response
      .json()
      .catch(() => ({}))) as OpenAiResponseBody;

    if (!response.ok || body.error) {
      throw new BadGatewayException(
        body.error?.message ?? Errors.Assistant.ProviderRequestFailed,
      );
    }

    const content = this.extractText(body);
    if (!content) {
      throw new BadGatewayException(Errors.Assistant.ProviderEmptyResponse);
    }

    return {
      message: {
        role: 'assistant',
        content,
      },
      model: body.model ?? this.model,
      providerResponseId: body.id,
      usage: body.usage
        ? {
            inputTokens: body.usage.input_tokens,
            outputTokens: body.usage.output_tokens,
            totalTokens: body.usage.total_tokens,
          }
        : undefined,
    };
  }

  private get responsesUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/responses`;
  }

  private extractText(body: OpenAiResponseBody): string {
    return (
      body.output
        ?.flatMap((output) => output.content ?? [])
        .filter((content) => content.type === 'output_text')
        .map((content) => content.text)
        .filter(Boolean)
        .join('\n')
        .trim() ?? ''
    );
  }
}
