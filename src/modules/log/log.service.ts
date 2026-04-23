import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Log } from './log.entity';
import { LogDetail } from './log-detail.entity';
import { CreateLogDto } from './log.dto';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(
    projectId: string,
    apiKeyId: string,
    dto: CreateLogDto,
  ): Promise<Log> {
    return this.dataSource.transaction(async (manager) => {
      const log = manager.create(Log, {
        project_id: projectId,
        api_key_id: apiKeyId,
        trace_id: dto.traceId,
        span_id: dto.spanId,
        parent_span_id: dto.parentSpanId ?? null,
        service_key: dto.serviceKey,
        service_name: dto.serviceName ?? null,
        service_version: dto.serviceVersion ?? null,
        service_description: dto.serviceDescription ?? null,
        service_origin: dto.serviceOrigin,
        method: dto.method,
        path: dto.path,
        origin: dto.origin,
        protocol: dto.protocol,
        status_code: dto.statusCode,
        duration_ms: dto.durationMs,
        timestamp: new Date(dto.timestamp),
      });
      const savedLog = await manager.save(log);

      const detail = manager.create(LogDetail, {
        log_id: savedLog.id,
        body_size_kb: dto.bodySizeKB,
        content_length: dto.contentLength ?? 0,
        content_type: dto.contentType ?? '',
        body: dto.body ?? null,
        headers: dto.headers ?? {},
        completed: dto.completed,
        aborted: dto.aborted,
        idempotent: dto.idempotent,
      });
      await manager.save(detail);

      return savedLog;
    });
  }

  async findByProjectId(
    projectId: string,
    limit = 100,
    offset = 0,
  ): Promise<Log[]> {
    return this.logRepository.find({
      where: { project_id: projectId },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findDetail(projectId: string, logId: string): Promise<LogDetail> {
    const log = await this.logRepository.findOne({
      where: { id: logId, project_id: projectId },
      relations: ['detail'],
    });

    if (!log) throw new NotFoundException(`Log ${logId} not found`);
    if (!log.detail) {
      throw new NotFoundException(`Log ${logId} has no detail record`);
    }

    return log.detail;
  }
}
