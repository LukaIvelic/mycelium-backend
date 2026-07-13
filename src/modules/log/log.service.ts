import { Inject, Injectable } from '@nestjs/common';
import type { Log } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import type { ApiKeyStatsRequest } from '../api-key-stats/api-key-stats.dto';
import { ApiKeyStatsService } from '../api-key-stats/api-key-stats.service';
import { FlowService } from '../flow/flow.service';
import { IntegrationService } from '../integration/integration.service';
import { LogDetailService } from '../log-detail/log-detail.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectService } from '../project/project.service';
import type { CreateLogDto } from './log.dto';
import { LogRepository } from './log.repository';

/** Creates logs and lists them for authorized project owners. */
@Injectable()
export class LogService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly logRepository: LogRepository,
    private readonly projectService: ProjectService,
    private readonly apiKeyStatsService: ApiKeyStatsService,
    private readonly flowService: FlowService,
    private readonly integrationService: IntegrationService,
    private readonly logDetailService: LogDetailService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Creates a log and its detail record in a single transaction.
   * @param projectId Project that owns the log.
   * @param apiKeyId API key used to send the log.
   * @param dto Log payload from the SDK.
   * @param request Incoming log-ingestion request metadata.
   * @returns The created log record.
   */
  async create(
    projectId: string,
    apiKeyId: string,
    dto: CreateLogDto,
    request: ApiKeyStatsRequest,
  ): Promise<Log> {
    return this.db.transaction(async (tx) => {
      const integration = await this.integrationService.upsertFromLog(
        projectId,
        apiKeyId,
        dto,
        tx,
      );
      const callerIntegration =
        await this.integrationService.findByProjectIdAndOrigin(
          projectId,
          dto.origin,
          tx,
        );

      const log = await this.logRepository.insert(
        {
          projectId,
          apiKeyId,
          integrationId: integration?.id ?? null,
          callerIntegrationId: callerIntegration?.id ?? null,
          traceId: dto.traceId,
          spanId: dto.spanId,
          parentSpanId: dto.parentSpanId ?? null,
          integrationKey: dto.integrationKey ?? null,
          integrationName: dto.integrationName ?? null,
          integrationVersion: dto.integrationVersion ?? null,
          integrationDescription: dto.integrationDescription ?? null,
          integrationOrigin: dto.integrationOrigin ?? null,
          method: dto.method,
          path: dto.path,
          origin: dto.origin,
          protocol: dto.protocol,
          statusCode: dto.statusCode,
          durationMs: dto.durationMs,
          timestamp: new Date(dto.timestamp),
        },
        tx,
      );

      await this.logDetailService.create(tx, log.id, {
        bodySizeKB: dto.bodySizeKB,
        contentLength: dto.contentLength,
        contentType: dto.contentType,
        body: dto.body,
        headers: dto.headers,
        completed: dto.completed,
        aborted: dto.aborted,
        idempotent: dto.idempotent,
      });

      await this.flowService.syncProjectFlowWithLog(
        log,
        integration,
        callerIntegration,
        {
          bodySizeKb: dto.bodySizeKB,
          hasBody: Boolean(dto.body),
          headerSizeBytes: Buffer.byteLength(
            JSON.stringify(dto.headers ?? {}),
            'utf8',
          ),
        },
        tx,
      );

      await this.apiKeyStatsService.trackLogIngest(apiKeyId, log, request, tx);
      await this.notificationService.createLogNotifications(log, tx);

      return log;
    });
  }

  /**
   * Lists logs for a project after verifying ownership.
   * @param projectId Project identifier.
   * @param userId User requesting the logs.
   * @param limit Maximum number of logs to return.
   * @param offset Number of logs to skip.
   * @returns Logs ordered by newest first.
   */
  async findByProjectId(
    projectId: string,
    userId: string,
    limit = 100,
    offset = 0,
  ): Promise<Log[]> {
    await this.projectService.findOne(projectId, userId);
    return this.logRepository.findByProjectId(projectId, limit, offset);
  }

  /**
   * Lists logs for an integration after verifying the caller owns its project.
   * @param integrationId Integration identifier.
   * @param userId User requesting the logs.
   * @param limit Maximum number of logs to return.
   * @param offset Number of logs to skip.
   * @returns Logs ordered by newest first.
   */
  async findByIntegrationId(
    integrationId: string,
    userId: string,
    limit = 100,
    offset = 0,
  ): Promise<Log[]> {
    const integration = await this.integrationService.findById(integrationId);
    await this.projectService.findOne(integration.projectId, userId);

    return this.logRepository.findByIntegrationId(integrationId, limit, offset);
  }
}
