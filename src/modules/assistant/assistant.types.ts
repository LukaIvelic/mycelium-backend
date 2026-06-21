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
  streamCompletion(
    request: AssistantCompletionRequest,
    onDelta: (delta: string) => void,
  ): Promise<AssistantChatResponse>;
}

export interface OpenAiResponseUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface OpenAiFunctionCall {
  arguments: string;
  call_id: string;
  name: string;
}

export interface OpenAiStreamEvent {
  delta?: string;
  item?: {
    arguments?: string;
    call_id?: string;
    name?: string;
    type?: string;
  };
  message?: string;
  response?: {
    error?: { message?: string };
    id?: string;
    model?: string;
    usage?: OpenAiResponseUsage;
  };
  type?: string;
}

export interface OpenAiResponseBody {
  error?: {
    message?: string;
  } | null;
  id?: string;
  model?: string;
  output?: Array<{
    arguments?: string;
    call_id?: string;
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    name?: string;
    role?: string;
    type?: string;
  }>;
  usage?: OpenAiResponseUsage;
}
