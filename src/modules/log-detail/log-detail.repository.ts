import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  type Log,
  type LogDetail,
  logDetails,
  logs,
  type NewLogDetail,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

/** Data access for the `log_detail` table and parent-log lookups. */
@Injectable()
export class LogDetailRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Inserts a new log detail row.
   * @param values Log detail insert payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns A promise that resolves when the row is inserted.
   */
  async insert(values: NewLogDetail, tx?: Database): Promise<void> {
    await (tx ?? this.db).insert(logDetails).values(values);
  }

  /**
   * Loads a log detail by its parent log id.
   * @param logId Parent log identifier.
   * @returns The stored detail, or `null` when absent.
   */
  async findByLogId(logId: string): Promise<LogDetail | null> {
    const [detail] = await this.db
      .select()
      .from(logDetails)
      .where(eq(logDetails.logId, logId));
    return detail ?? null;
  }

  /**
   * Loads the parent log used for ownership lookups.
   * @param logId Log identifier.
   * @returns The parent log, or `null` when absent.
   */
  async findLogById(logId: string): Promise<Log | null> {
    const [log] = await this.db.select().from(logs).where(eq(logs.id, logId));
    return log ?? null;
  }
}
