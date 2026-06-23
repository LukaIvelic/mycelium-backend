import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { communicationHeaderFilterLevelValues } from '@/database';

export class PerformanceSettingsDto {
  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  captureMetrics?: boolean;

  @ApiProperty({ required: false, example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  slowRequestThresholdMs?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnSlowRequests?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnFailedRequests?: boolean;

  @ApiProperty({ required: false, example: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  warningStatusCode?: number;

  @ApiProperty({ required: false, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  criticalStatusCode?: number;
}

export class CommunicationSettingsDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  subscribeToFetch?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  subscribeToHttp?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  captureBody?: boolean;

  @ApiProperty({ required: false, example: 5120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bodyMaxBytes?: number;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  captureStreamBodies?: boolean;

  @ApiProperty({
    required: false,
    enum: communicationHeaderFilterLevelValues,
    example: 'HIGH',
  })
  @IsOptional()
  @IsIn(communicationHeaderFilterLevelValues)
  headerFilterLevel?: (typeof communicationHeaderFilterLevelValues)[number];
}

export class RuntimeSettingsQueryDto {
  @ApiProperty({ example: 'https://orders.example.com' })
  @IsString()
  origin!: string;

  @ApiProperty({ required: false, example: 'orders-api' })
  @IsOptional()
  @IsString()
  key?: string;
}

export class ProjectRegionSettingsDto {
  @ApiProperty({ required: false, example: 'EU Central' })
  @IsOptional()
  @IsString()
  primaryRegion?: string;

  @ApiProperty({ required: false, example: 'European Union' })
  @IsOptional()
  @IsString()
  dataResidency?: string;

  @ApiProperty({ required: false, example: 'EU West' })
  @IsOptional()
  @IsString()
  failoverRegion?: string;

  @ApiProperty({ required: false, example: 'Europe/Zagreb' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;
}

export class UserNotificationSettingsDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  workspaceActivity?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  securityNotices?: boolean;

  @ApiProperty({ required: false, example: '09:00' })
  @IsOptional()
  @IsString()
  dailyDigestTime?: string;

  @ApiProperty({ required: false, example: 'Friday' })
  @IsOptional()
  @IsString()
  weeklyReportDay?: string;

  @ApiProperty({ required: false, example: '22:00' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiProperty({ required: false, example: '07:00' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}

export class UserAccessibilitySettingsDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  reducedMotion?: boolean;

  @ApiProperty({ required: false, example: 'Standard' })
  @IsOptional()
  @IsString()
  contrastPreference?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  focusIndicators?: boolean;

  @ApiProperty({ required: false, example: 'Comfortable' })
  @IsOptional()
  @IsString()
  textDensity?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  screenReaderLabels?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  keyboardShortcuts?: boolean;
}

export class PerformanceSettingsResponse {
  @ApiProperty({ required: false, format: 'uuid' })
  projectId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  integrationId?: string;

  @ApiProperty({ example: false })
  captureMetrics!: boolean;

  @ApiProperty({ example: 1000 })
  slowRequestThresholdMs!: number;

  @ApiProperty({ example: true })
  notifyOnSlowRequests!: boolean;

  @ApiProperty({ example: true })
  notifyOnFailedRequests!: boolean;

  @ApiProperty({ example: 400 })
  warningStatusCode!: number;

  @ApiProperty({ example: 500 })
  criticalStatusCode!: number;

  @ApiProperty({ nullable: true, example: null })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, example: null })
  updatedAt!: Date | null;
}

export class CommunicationSettingsResponse {
  @ApiProperty({ required: false, format: 'uuid' })
  projectId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  integrationId?: string;

  @ApiProperty({ example: true })
  subscribeToFetch!: boolean;

  @ApiProperty({ example: false })
  subscribeToHttp!: boolean;

  @ApiProperty({ example: true })
  captureBody!: boolean;

  @ApiProperty({ example: 5120 })
  bodyMaxBytes!: number;

  @ApiProperty({ example: false })
  captureStreamBodies!: boolean;

  @ApiProperty({ enum: communicationHeaderFilterLevelValues, example: 'HIGH' })
  headerFilterLevel!: (typeof communicationHeaderFilterLevelValues)[number];

  @ApiProperty({ nullable: true, example: null })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, example: null })
  updatedAt!: Date | null;
}

export class RuntimeSettingsResponse {
  @ApiProperty({ type: PerformanceSettingsResponse })
  performance!: Omit<PerformanceSettingsResponse, 'createdAt' | 'updatedAt'>;

  @ApiProperty({ type: CommunicationSettingsResponse })
  communication!: Omit<
    CommunicationSettingsResponse,
    'createdAt' | 'updatedAt'
  >;
}

export class ProjectRegionSettingsResponse {
  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ example: 'EU Central' })
  primaryRegion!: string;

  @ApiProperty({ example: 'European Union' })
  dataResidency!: string;

  @ApiProperty({ example: 'EU West' })
  failoverRegion!: string;

  @ApiProperty({ example: 'Europe/Zagreb' })
  timezone!: string;

  @ApiProperty({ example: 'DD/MM/YYYY' })
  dateFormat!: string;

  @ApiProperty({ nullable: true, example: null })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, example: null })
  updatedAt!: Date | null;
}

export class UserNotificationSettingsResponse {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: true })
  productUpdates!: boolean;

  @ApiProperty({ example: true })
  workspaceActivity!: boolean;

  @ApiProperty({ example: true })
  securityNotices!: boolean;

  @ApiProperty({ example: '09:00' })
  dailyDigestTime!: string;

  @ApiProperty({ example: 'Friday' })
  weeklyReportDay!: string;

  @ApiProperty({ example: '22:00' })
  quietHoursStart!: string;

  @ApiProperty({ example: '07:00' })
  quietHoursEnd!: string;

  @ApiProperty({ nullable: true, example: null })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, example: null })
  updatedAt!: Date | null;
}

export class UserAccessibilitySettingsResponse {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: true })
  reducedMotion!: boolean;

  @ApiProperty({ example: 'Standard' })
  contrastPreference!: string;

  @ApiProperty({ example: true })
  focusIndicators!: boolean;

  @ApiProperty({ example: 'Comfortable' })
  textDensity!: string;

  @ApiProperty({ example: true })
  screenReaderLabels!: boolean;

  @ApiProperty({ example: true })
  keyboardShortcuts!: boolean;

  @ApiProperty({ nullable: true, example: null })
  createdAt!: Date | null;

  @ApiProperty({ nullable: true, example: null })
  updatedAt!: Date | null;
}
