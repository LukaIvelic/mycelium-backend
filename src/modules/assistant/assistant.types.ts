import type {
  AssistantChatResponse,
  AssistantMessageDto,
} from './assistant.dto';

export interface AssistantCompletionRequest {
  messages: AssistantMessageDto[];
  projectId?: string;
  userId: string;
}

export interface AssistantProvider {
  createCompletion(
    request: AssistantCompletionRequest,
  ): Promise<AssistantChatResponse>;
}

export interface OpenAiResponseUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface OpenAiResponseBody {
  error?: {
    message?: string;
  } | null;
  id?: string;
  model?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    role?: string;
    type?: string;
  }>;
  usage?: OpenAiResponseUsage;
}
