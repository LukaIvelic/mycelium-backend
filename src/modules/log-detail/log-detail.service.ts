import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { logs, logDetails, type LogDetail } from '@/database';
import { Errors } from '@/lib/constants/errors';
import { CreateLogDetailDto } from './log-detail.dto';
import { ProjectService } from '../project/project.service';

@Injectable()
export class LogDetailService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly projectService: ProjectService,
  ) {}

  async create(
    tx: Database,
    logId: string,
    dto: CreateLogDetailDto,
  ): Promise<void> {
    await tx.insert(logDetails).values({
      logId,
      bodySizeKb: dto.bodySizeKB,
      contentLength: dto.contentLength ?? 0,
      contentType: dto.contentType ?? '',
      body: dto.body ?? null,
      headers: dto.headers ?? {},
      completed: dto.completed,
      aborted: dto.aborted,
      idempotent: dto.idempotent,
    });
  }

  async findOne(logId: string, userId: string): Promise<LogDetail> {
    const [log] = await this.db.select().from(logs).where(eq(logs.id, logId));
    if (!log) throw new NotFoundException(Errors.Log.NotFound(logId));

    await this.projectService.findOne(log.projectId, userId);

    const [detail] = await this.db
      .select()
      .from(logDetails)
      .where(eq(logDetails.logId, logId));
    if (!detail) throw new NotFoundException(Errors.LogDetail.NotFound(logId));

    return detail;
  }
}
