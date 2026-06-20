import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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

  @ApiProperty({ example: 'gpt-4.1' })
  model!: string;

  @ApiProperty({ required: false, example: 'resp_123' })
  providerResponseId?: string;

  @ApiProperty({ required: false, type: AssistantUsageDto })
  usage?: AssistantUsageDto;
}
