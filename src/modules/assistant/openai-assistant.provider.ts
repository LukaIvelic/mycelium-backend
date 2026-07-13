import {
  BadGatewayException,
  Injectable,
  Logger,
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
  AssistantAccount,
  AssistantCompletionRequest,
  AssistantProvider,
  OpenAiFunctionCall,
  OpenAiResponseBody,
  OpenAiStreamEvent,
} from './assistant.types';
import {
  ASSISTANT_MAX_TOOL_ITERATIONS,
  ASSISTANT_SQL_MAX_RESULT_CHARS,
  AssistantSqlValidationError,
  buildSqlToolGuidance,
} from './assistant-sql.config';
import { AssistantSqlService } from './assistant-sql.service';

const SQL_TOOL_NAME = 'run_sql_query';

const SQL_TOOL_DEFINITION = {
  type: 'function',
  name: SQL_TOOL_NAME,
  description:
    'Run a single read-only PostgreSQL SELECT query against the Mycelium database and return the rows as JSON.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A single read-only SQL SELECT (or WITH ... SELECT) statement. No semicolons or comments.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  strict: true,
} as const;

type AssistantReasoningEffort = 'medium' | 'none';

interface OpenAiRequestOptions {
  model: string;
  reasoning: {
    effort: AssistantReasoningEffort;
  };
}

@Injectable()
export class OpenAiAssistantProvider implements AssistantProvider {
  private readonly logger = new Logger(OpenAiAssistantProvider.name);
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly maxOutputTokens: number;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor(
    config: ConfigService,
    private readonly sqlService: AssistantSqlService,
  ) {
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

    const toolsEnabled = this.sqlService.isEnabled;
    const instructions = this.buildInstructions(request, toolsEnabled);
    const input: unknown[] = request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const requestOptions = this.buildRequestOptions(request);

    // Tool-calling loop: let the model request data, run it, feed it back.
    // The final iteration disables tools so the model must produce an answer.
    for (let iteration = 0; ; iteration++) {
      const allowTools =
        toolsEnabled && iteration < ASSISTANT_MAX_TOOL_ITERATIONS;
      const body = await this.requestResponse(
        input,
        instructions,
        allowTools,
        requestOptions,
      );

      const functionCalls = allowTools ? this.extractFunctionCalls(body) : [];
      if (!functionCalls.length) {
        const content = this.extractText(body);
        if (!content) {
          throw new BadGatewayException(Errors.Assistant.ProviderEmptyResponse);
        }
        return this.buildResponse(content, body, requestOptions.model);
      }

      for (const call of functionCalls) {
        input.push({
          type: 'function_call',
          call_id: call.call_id,
          name: call.name,
          arguments: call.arguments,
        });
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: await this.runTool(call, request),
        });
      }
    }
  }

  /**
   * Same tool-calling loop as {@link createCompletion}, but the final answer is
   * streamed token-by-token through `onDelta`. Intermediate tool-calling turns
   * emit no user-facing text; only the answer turn produces deltas.
   */
  async streamCompletion(
    request: AssistantCompletionRequest,
    onDelta: (delta: string) => void,
  ): Promise<AssistantChatResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        Errors.Assistant.MissingOpenAiApiKey,
      );
    }

    const toolsEnabled = this.sqlService.isEnabled;
    const instructions = this.buildInstructions(request, toolsEnabled);
    const input: unknown[] = request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const requestOptions = this.buildRequestOptions(request);

    for (let iteration = 0; ; iteration++) {
      const allowTools =
        toolsEnabled && iteration < ASSISTANT_MAX_TOOL_ITERATIONS;
      const turn = await this.streamTurn(
        input,
        instructions,
        allowTools,
        onDelta,
        requestOptions,
      );

      if (allowTools && turn.functionCalls.length) {
        for (const call of turn.functionCalls) {
          input.push({
            type: 'function_call',
            call_id: call.call_id,
            name: call.name,
            arguments: call.arguments,
          });
          input.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: await this.runTool(call, request),
          });
        }
        continue;
      }

      if (!turn.text) {
        throw new BadGatewayException(Errors.Assistant.ProviderEmptyResponse);
      }

      return {
        message: { role: 'assistant', content: turn.text },
        model: turn.model ?? requestOptions.model,
        providerResponseId: turn.id,
        usage: turn.usage
          ? {
              inputTokens: turn.usage.input_tokens,
              outputTokens: turn.usage.output_tokens,
              totalTokens: turn.usage.total_tokens,
            }
          : undefined,
      };
    }
  }

  private async streamTurn(
    input: unknown[],
    instructions: string,
    allowTools: boolean,
    onDelta: (delta: string) => void,
    requestOptions: OpenAiRequestOptions,
  ): Promise<{
    functionCalls: OpenAiFunctionCall[];
    id?: string;
    model?: string;
    text: string;
    usage?: OpenAiResponseBody['usage'];
  }> {
    const response = await fetch(this.responsesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        instructions,
        max_output_tokens: this.maxOutputTokens,
        model: requestOptions.model,
        reasoning: requestOptions.reasoning,
        store: false,
        stream: true,
        ...(allowTools && {
          tools: [SQL_TOOL_DEFINITION],
          tool_choice: 'auto',
        }),
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = (await response
        .json()
        .catch(() => ({}))) as OpenAiResponseBody;
      throw new BadGatewayException(
        errorBody.error?.message ?? Errors.Assistant.ProviderRequestFailed,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const functionCalls: OpenAiFunctionCall[] = [];
    let buffer = '';
    let text = '';
    let usage: OpenAiResponseBody['usage'];
    let id: string | undefined;
    let model: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const event = this.parseStreamChunk(chunk);
        if (!event) continue;

        switch (event.type) {
          case 'response.output_text.delta': {
            if (event.delta) {
              text += event.delta;
              onDelta(event.delta);
            }
            break;
          }
          case 'response.output_item.done': {
            const item = event.item;
            if (item?.type === 'function_call' && item.call_id && item.name) {
              functionCalls.push({
                arguments: item.arguments ?? '{}',
                call_id: item.call_id,
                name: item.name,
              });
            }
            break;
          }
          case 'response.completed': {
            usage = event.response?.usage;
            id = event.response?.id;
            model = event.response?.model;
            break;
          }
          case 'response.failed':
          case 'error': {
            throw new BadGatewayException(
              event.response?.error?.message ??
                event.message ??
                Errors.Assistant.ProviderRequestFailed,
            );
          }
        }
      }
    }

    return { functionCalls, id, model, text, usage };
  }

  private parseStreamChunk(chunk: string): OpenAiStreamEvent | null {
    const data = chunk
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');

    if (!data || data === '[DONE]') return null;

    try {
      return JSON.parse(data) as OpenAiStreamEvent;
    } catch {
      return null;
    }
  }

  private async requestResponse(
    input: unknown[],
    instructions: string,
    allowTools: boolean,
    requestOptions: OpenAiRequestOptions,
  ): Promise<OpenAiResponseBody> {
    const response = await fetch(this.responsesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        instructions,
        max_output_tokens: this.maxOutputTokens,
        model: requestOptions.model,
        reasoning: requestOptions.reasoning,
        store: false,
        ...(allowTools && {
          tools: [SQL_TOOL_DEFINITION],
          tool_choice: 'auto',
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

    return body;
  }

  private async runTool(
    call: OpenAiFunctionCall,
    request: AssistantCompletionRequest,
  ): Promise<string> {
    if (call.name !== SQL_TOOL_NAME) {
      return JSON.stringify({ error: `Unknown tool: ${call.name}` });
    }

    let query = '';
    try {
      const args = JSON.parse(call.arguments || '{}') as { query?: unknown };
      query = typeof args.query === 'string' ? args.query : '';
    } catch {
      return JSON.stringify({ error: 'Invalid tool arguments JSON.' });
    }

    try {
      const result = await this.sqlService.runSelect(query);
      return this.serializeToolResult(result);
    } catch (error) {
      if (error instanceof AssistantSqlValidationError) {
        return JSON.stringify({ error: error.message });
      }
      this.logger.warn(
        `Assistant SQL query failed (user ${request.userId}): ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return JSON.stringify({
        error: 'Query execution failed. Check table/column names and retry.',
      });
    }
  }

  private serializeToolResult(result: {
    rows: Record<string, unknown>[];
    rowCount: number;
    truncated: boolean;
  }): string {
    const serialized = JSON.stringify(result);
    if (serialized.length <= ASSISTANT_SQL_MAX_RESULT_CHARS) {
      return serialized;
    }
    return JSON.stringify({
      rowCount: result.rowCount,
      truncated: true,
      note: 'Result omitted because it exceeded the size limit. Re-run with fewer columns or a smaller LIMIT.',
    });
  }

  private buildInstructions(
    request: AssistantCompletionRequest,
    toolsEnabled: boolean,
  ): string {
    const base = this.withAccountContext(this.systemPrompt, request.account);
    if (!toolsEnabled) return base;
    return `${base}\n\n${buildSqlToolGuidance(request.projectId)}`;
  }

  private withAccountContext(
    prompt: string,
    account?: AssistantAccount,
  ): string {
    if (!account) return prompt;
    return (
      `${prompt}\n\n` +
      `You are assisting the signed-in user: email \`${account.email}\` (user id \`${account.id}\`). ` +
      'When the user says "me", "my", or "my account", this is who they mean. ' +
      'Never expose or query data belonging to other users.'
    );
  }

  private extractFunctionCalls(body: OpenAiResponseBody): OpenAiFunctionCall[] {
    return (body.output ?? [])
      .filter(
        (item) =>
          item.type === 'function_call' &&
          typeof item.call_id === 'string' &&
          typeof item.name === 'string',
      )
      .map((item) => ({
        arguments: item.arguments ?? '{}',
        call_id: item.call_id as string,
        name: item.name as string,
      }));
  }

  private buildResponse(
    content: string,
    body: OpenAiResponseBody,
    fallbackModel: string,
  ): AssistantChatResponse {
    return {
      message: {
        role: 'assistant',
        content,
      },
      model: body.model ?? fallbackModel,
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

  private buildRequestOptions(
    request: AssistantCompletionRequest,
  ): OpenAiRequestOptions {
    return {
      model: request.model ?? this.model,
      reasoning: {
        effort: request.thinking === false ? 'none' : 'medium',
      },
    };
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
