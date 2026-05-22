import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { type Log, logs, type NewLog } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

/** Data access for the `log` table. */
@Injectable()
export class LogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Inserts a new log row.
   * @param values Log insert payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns The inserted log record.
   */
  async insert(values: NewLog, tx?: Database): Promise<Log> {
    const [log] = await (tx ?? this.db).insert(logs).values(values).returning();
    return log;
  }

  /**
   * Lists logs for a project ordered by newest first.
   * @param projectId Project identifier.
   * @param limit Maximum number of logs to return.
   * @param offset Number of logs to skip.
   * @returns Logs for the project.
   */
  async findByProjectId(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<Log[]> {
    return this.db
      .select()
      .from(logs)
      .where(eq(logs.projectId, projectId))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Lists logs for an integration ordered by newest first.
   * @param integrationId Integration identifier.
   * @param limit Maximum number of logs to return.
   * @param offset Number of logs to skip.
   * @returns Logs for the integration.
   */
  async findByIntegrationId(
    integrationId: string,
    limit: number,
    offset: number,
  ): Promise<Log[]> {
    return this.db
      .select()
      .from(logs)
      .where(eq(logs.integrationId, integrationId))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset);
  }
}
