import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import {
  type AssignableProjectMemberRole,
  assignableProjectMemberRoleValues,
  type ProjectMemberRole,
  type PublicApiKey,
} from '@/database';

export enum ProjectSortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export enum ProjectSortField {
  Name = 'Name',
  RecentActivity = 'RecentActivity',
  RegistrationDate = 'RegistrationDate',
}

export interface ProjectSortOptions {
  field: ProjectSortField;
  sort: ProjectSortDirection;
}

export class AddApiKeyDto {
  @ApiProperty({ example: 'production key', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'first project' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'This is my first project', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class AddProjectMemberDto {
  @ApiProperty({ example: 'teammate@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: assignableProjectMemberRoleValues, example: 'member' })
  @IsIn(assignableProjectMemberRoleValues)
  role!: AssignableProjectMemberRole;
}

export class UpdateProjectMemberDto {
  @ApiProperty({ enum: assignableProjectMemberRoleValues, example: 'admin' })
  @IsIn(assignableProjectMemberRoleValues)
  role!: AssignableProjectMemberRole;
}

export class ProjectMemberResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  projectId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({ example: 'teammate@example.com' })
  email!: string;

  @ApiProperty({ enum: ['owner', 'admin', 'member', 'viewer'] })
  role!: ProjectMemberRole;

  @ApiProperty({ example: false })
  isOwner!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class AddApiKeyToProjectResponse {
  @IsString()
  key!: string;

  @IsString()
  message!: string;

  entity!: PublicApiKey;
}
