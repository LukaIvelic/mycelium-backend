import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'johdoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Backend engineer', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: 'Software Engineer', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ example: 'Mycelium', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ example: 'Zagreb, Croatia' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
