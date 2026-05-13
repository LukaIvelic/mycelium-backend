import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { type Log, logs } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { IntegrationService } from '../integration/integration.service';
import { LogDetailService } from '../log-detail/log-detail.service';
import { ProjectService } from '../project/project.service';
import type { CreateLogDto } from './log.dto';

/** Creates logs and lists them for authorized project owners. */
@Injectable()
export class LogService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly projectService: ProjectService,
    private readonly integrationService: IntegrationService,
    private readonly logDetailService: LogDetailService,
  ) {}

  /**
   * Creates a log and its detail record in a single transaction.
   * @param projectId Project that owns the log.
   * @param apiKeyId API key used to send the log.
   * @param dto Log payload from the SDK.
   * @returns The created log record.
   */
  async create(
    projectId: string,
    apiKeyId: string,
    dto: CreateLogDto,
  ): Promise<Log> {
    return this.db.transaction(async (tx) => {
      const integration = await this.integrationService.upsertFromLog(
        projectId,
        apiKeyId,
        dto,
        tx,
      );

      const [log] = await tx
        .insert(logs)
        .values({
          projectId,
          apiKeyId,
          integrationId: integration?.id ?? null,
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
        })
        .returning();

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
    return this.db
      .select()
      .from(logs)
      .where(eq(logs.projectId, projectId))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset);
  }
}
