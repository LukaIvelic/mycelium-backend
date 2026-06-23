import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ example: 'https://orders.example.com' })
  @IsString()
  origin!: string;

  @ApiProperty({ required: false, nullable: true, example: 'orders-api' })
  @IsOptional()
  @IsString()
  key?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Orders API' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1.2.0' })
  @IsOptional()
  @IsString()
  version?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Handles order placement and fulfillment.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://github.com/org/orders-api',
  })
  @IsOptional()
  @IsString()
  repository?: string | null;
}

export class UpdateIntegrationDto {
  @ApiProperty({ required: false, example: 'https://orders.example.com' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({ required: false, nullable: true, example: 'orders-api' })
  @IsOptional()
  @IsString()
  key?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Orders API' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '1.2.0' })
  @IsOptional()
  @IsString()
  version?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Handles order placement and fulfillment.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://github.com/org/orders-api',
  })
  @IsOptional()
  @IsString()
  repository?: string | null;
}

export class ListIntegrationsQueryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  projectId!: string;
}
