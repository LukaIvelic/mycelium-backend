import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateLogDto {
  @ApiProperty({ example: 'GET' })
  @IsString()
  method!: string;

  @ApiProperty({ required: false, nullable: true, example: null })
  @IsOptional()
  @IsString()
  body!: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  aborted!: boolean;

  @ApiProperty({ example: '/api/users' })
  @IsString()
  path!: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsString()
  origin!: string;

  @ApiProperty({ example: 'https' })
  @IsString()
  protocol!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  idempotent!: boolean;

  @ApiProperty({ required: false, nullable: true, example: 128 })
  @IsOptional()
  @IsInt()
  @Min(0)
  contentLength?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 'application/json' })
  @IsOptional()
  @IsString()
  contentType?: string | null;

  @ApiProperty({
    required: false,
    example: { 'content-type': 'application/json' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsString()
  traceId!: string;

  @ApiProperty({ example: 'abcdef0123456789' })
  @IsString()
  spanId!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  parentSpanId?: string;

  @ApiProperty({ required: false, nullable: true, example: 'orders-api' })
  @IsOptional()
  @IsString()
  integrationKey?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Orders API' })
  @IsOptional()
  @IsString()
  integrationName?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1.2.0' })
  @IsOptional()
  @IsString()
  integrationVersion?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'An integration that provides information about flowers',
  })
  @IsOptional()
  @IsString()
  integrationDescription?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://github.com/org/orders-api',
  })
  @IsOptional()
  @IsString()
  integrationRepository?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'http://localhost:3003',
  })
  @IsOptional()
  @IsString()
  integrationOrigin?: string | null;

  @ApiProperty({ example: 0.128 })
  @IsNumber()
  @Min(0)
  bodySizeKB!: number;

  @ApiProperty({ example: '2026-04-21T10:00:00.000Z' })
  @IsISO8601()
  timestamp!: string;

  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  durationMs!: number;

  @ApiProperty({ example: 200 })
  @IsInt()
  statusCode!: number;
}

export class ListLogsQueryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ required: false, example: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiProperty({ required: false, example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ListIntegrationLogsQueryDto {
  @ApiProperty({ required: false, example: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiProperty({ required: false, example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
