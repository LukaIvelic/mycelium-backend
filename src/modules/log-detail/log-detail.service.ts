import { Injectable, NotFoundException } from '@nestjs/common';
import type { LogDetail } from '@/database';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { ProjectService } from '../project/project.service';
import type { CreateLogDetailDto } from './log-detail.dto';
import { LogDetailRepository } from './log-detail.repository';

/** Persists and retrieves extended log detail payloads. */
@Injectable()
export class LogDetailService {
  constructor(
    private readonly logDetailRepository: LogDetailRepository,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * Creates the detail row for a log inside an existing transaction.
   * @param tx Transaction used to persist the detail.
   * @param logId Parent log identifier.
   * @param dto Detail payload to store.
   * @returns A promise that resolves when the detail is inserted.
   */
  async create(
    tx: Database,
    logId: string,
    dto: CreateLogDetailDto,
  ): Promise<void> {
    await this.logDetailRepository.insert(
      {
        logId,
        bodySizeKb: dto.bodySizeKB,
        contentLength: dto.contentLength ?? 0,
        contentType: dto.contentType ?? '',
        body: dto.body ?? null,
        headers: dto.headers ?? {},
        completed: dto.completed,
        aborted: dto.aborted,
        idempotent: dto.idempotent,
      },
      tx,
    );
  }

  /**
   * Finds a log detail after verifying the user owns the parent project.
   * @param logId Parent log identifier.
   * @param userId User requesting the detail.
   * @returns The stored log detail.
   */
  async findOne(logId: string, userId: string): Promise<LogDetail> {
    const log = await this.logDetailRepository.findLogById(logId);
    if (!log) throw new NotFoundException(Errors.Log.NotFound(logId));

    await this.projectService.findOne(log.projectId, userId);

    const detail = await this.logDetailRepository.findByLogId(logId);
    if (!detail) throw new NotFoundException(Errors.LogDetail.NotFound(logId));

    return detail;
  }
}
