import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiKey } from '../api-key/entities/api_key.entity';

export class AddApiKeyDto {
  @ApiProperty({ example: 'production key', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'first project' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'This is my first project', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  user_id: string;
}

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['user_id'] as const),
) {}

export class AddApiKeyToProjectResponse {
  @IsString()
  key: string;

  @IsString()
  message: string;

  entity: ApiKey;
}
