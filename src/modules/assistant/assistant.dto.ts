import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const assistantMessageRoleValues = [
  'assistant',
  'system',
  'user',
] as const;

export type AssistantMessageRole = (typeof assistantMessageRoleValues)[number];

export const assistantModelValues = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
] as const;

export type AssistantModel = (typeof assistantModelValues)[number];

export class AssistantMessageDto {
  @ApiProperty({ enum: assistantMessageRoleValues, example: 'user' })
  @IsIn(assistantMessageRoleValues)
  role!: AssistantMessageRole;

  @ApiProperty({ example: 'Why did this request fail?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class AssistantChatDto {
  @ApiProperty({
    type: [AssistantMessageDto],
    example: [{ role: 'user', content: 'Summarize my recent project errors.' }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages!: AssistantMessageDto[];

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    enum: assistantModelValues,
    example: 'gpt-5.6-sol',
    required: false,
  })
  @IsOptional()
  @IsIn(assistantModelValues)
  model?: AssistantModel;

  @ApiProperty({
    default: true,
    description:
      'When true, the assistant uses medium reasoning effort. When false, it requests no reasoning effort.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  thinking?: boolean;
}

export class AssistantUsageDto {
  @ApiProperty({ required: false, example: 120 })
  inputTokens?: number;

  @ApiProperty({ required: false, example: 80 })
  outputTokens?: number;

  @ApiProperty({ required: false, example: 200 })
  totalTokens?: number;
}

export class AssistantChatResponse {
  @ApiProperty({
    type: AssistantMessageDto,
    example: {
      role: 'assistant',
      content: 'The latest errors are concentrated in authentication.',
    },
  })
  message!: AssistantMessageDto;

  @ApiProperty({ example: 'gpt-5.6-sol' })
  model!: string;

  @ApiProperty({ required: false, example: 'resp_123' })
  providerResponseId?: string;

  @ApiProperty({ required: false, type: AssistantUsageDto })
  usage?: AssistantUsageDto;
}
