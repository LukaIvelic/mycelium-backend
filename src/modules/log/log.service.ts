import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { type Log, logs } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { LogDetailService } from '../log-detail/log-detail.service';
import { ProjectService } from '../project/project.service';
import type { CreateLogDto } from './log.dto';

@Injectable()
export class LogService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly projectService: ProjectService,
    private readonly logDetailService: LogDetailService,
  ) {}

  async create(
    projectId: string,
    apiKeyId: string,
    dto: CreateLogDto,
  ): Promise<Log> {
    return this.db.transaction(async (tx) => {
      const [log] = await tx
        .insert(logs)
        .values({
          projectId,
          apiKeyId,
          traceId: dto.traceId,
          spanId: dto.spanId,
          parentSpanId: dto.parentSpanId ?? null,
          serviceKey: dto.serviceKey,
          serviceName: dto.serviceName ?? null,
          serviceVersion: dto.serviceVersion ?? null,
          serviceDescription: dto.serviceDescription ?? null,
          serviceOrigin: dto.serviceOrigin,
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
