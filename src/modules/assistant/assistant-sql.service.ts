import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import {
  ASSISTANT_SQL_CONNECTION_TIMEOUT_MS,
  ASSISTANT_SQL_IDLE_TIMEOUT_MS,
  ASSISTANT_SQL_MAX_ROWS,
  ASSISTANT_SQL_POOL_MAX,
  ASSISTANT_SQL_TIMEOUT_MS,
  validateReadOnlyQuery,
} from './assistant-sql.config';

export interface AssistantSqlResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

@Injectable()
export class AssistantSqlService {
  private readonly logger = new Logger(AssistantSqlService.name);
  private readonly pool?: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL_READONLY');
    if (!connectionString) {
      this.logger.warn(
        'DATABASE_URL_READONLY is not set; assistant SQL access is disabled.',
      );
      return;
    }

    const isProduction = config.get<string>('NODE_ENV') === 'production';
    this.pool = new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: true } : false,
      max: ASSISTANT_SQL_POOL_MAX,
      connectionTimeoutMillis: ASSISTANT_SQL_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: ASSISTANT_SQL_IDLE_TIMEOUT_MS,
    });
  }

  get isEnabled(): boolean {
    return this.pool !== undefined;
  }

  /**
   * Runs a validated SELECT inside a READ ONLY transaction with a statement
   * timeout, capping the returned rows. Validation errors propagate so the
   * caller can relay them to the model; everything else is defense-in-depth on
   * top of the read-only database role.
   */
  async runSelect(query: string): Promise<AssistantSqlResult> {
    if (!this.pool) {
      throw new Error('Read-only database is not configured.');
    }

    const safeQuery = validateReadOnlyQuery(query);
    const wrapped = `SELECT * FROM (${safeQuery}) AS _ai_query LIMIT ${ASSISTANT_SQL_MAX_ROWS + 1}`;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN TRANSACTION READ ONLY');
      await client.query(
        `SET LOCAL statement_timeout = ${ASSISTANT_SQL_TIMEOUT_MS}`,
      );
      const result = await client.query(wrapped);
      await client.query('COMMIT');

      const truncated = result.rows.length > ASSISTANT_SQL_MAX_ROWS;
      const rows = truncated
        ? result.rows.slice(0, ASSISTANT_SQL_MAX_ROWS)
        : result.rows;

      return { rows, rowCount: rows.length, truncated };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
