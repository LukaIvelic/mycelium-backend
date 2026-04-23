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
  Max,
  Min,
} from 'class-validator';

export class CreateLogDto {
  @ApiProperty({ example: 'GET' })
  @IsString()
  method: string;

  @ApiProperty({ required: false, nullable: true, example: null })
  @IsOptional()
  @IsString()
  body: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  aborted: boolean;

  @ApiProperty({ example: '/api/users' })
  @IsString()
  path: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsString()
  origin: string;

  @ApiProperty({ example: 'https' })
  @IsString()
  protocol: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  idempotent: boolean;

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
  traceId: string;

  @ApiProperty({ example: 'abcdef0123456789' })
  @IsString()
  spanId: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  parentSpanId?: string;

  @ApiProperty({ example: 'orders-service' })
  @IsString()
  serviceKey: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Orders Service',
  })
  @IsOptional()
  @IsString()
  serviceName?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1.2.0' })
  @IsOptional()
  @IsString()
  serviceVersion?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'A service that provides information about flowers',
  })
  @IsOptional()
  @IsString()
  serviceDescription?: string | null;

  @ApiProperty({ example: 'http://localhost:3003' })
  @IsString()
  serviceOrigin: string;

  @ApiProperty({ example: 0.128 })
  @IsNumber()
  @Min(0)
  bodySizeKB: number;

  @ApiProperty({ example: '2026-04-21T10:00:00.000Z' })
  @IsISO8601()
  timestamp: string;

  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  durationMs: number;

  @ApiProperty({ example: 200 })
  @IsInt()
  statusCode: number;
}

export class ListLogsQueryDto {
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
