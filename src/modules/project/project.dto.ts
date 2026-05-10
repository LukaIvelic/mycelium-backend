import { PublicApiKey } from '@/database';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class AddApiKeyToProjectResponse {
  @IsString()
  key: string;

  @IsString()
  message: string;

  entity: PublicApiKey;
}
