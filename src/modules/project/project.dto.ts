import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'first project' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  user_id: string;
}

export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['user_id'] as const)) {}
