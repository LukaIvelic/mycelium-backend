import { ApiProperty } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import type { NotificationSeverity, NotificationType } from '@/database';

export class ListNotificationsQueryDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false, example: 'true' })
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;

  @ApiProperty({ required: false, example: '50' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class MarkAllNotificationsReadDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class NotificationResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  projectId!: string | null;

  @ApiProperty({ enum: ['project_member_added', 'server_error'] })
  type!: NotificationType;

  @ApiProperty({ enum: ['critical', 'info', 'warning'] })
  severity!: NotificationSeverity;

  @ApiProperty({ example: 'Project access granted' })
  title!: string;

  @ApiProperty({ example: 'You were added to My Project as member.' })
  description!: string;

  @ApiProperty({ example: null, nullable: true })
  readAt!: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
