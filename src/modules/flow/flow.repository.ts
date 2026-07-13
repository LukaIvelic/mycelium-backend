import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import {
  type Flow,
  flows,
  type Integration,
  integrations,
  type Log,
  logDetails,
  logs,
  type NewFlow,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

export interface FlowLogDetailSummaryRow {
  body: string | null;
  bodySizeKb: number;
  headers: unknown;
  logId: string;
}

/** Data access for the `flow` table plus reads needed to rebuild flow graphs. */
@Injectable()
export class FlowRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Loads the stored flow snapshot for a project.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle to join an existing read flow.
   * @returns The persisted flow row, or `null` when none exists.
   */
  async findByProjectId(
    projectId: string,
    tx?: Database,
  ): Promise<Flow | null> {
    const [flow] = await (tx ?? this.db)
      .select()
      .from(flows)
      .where(eq(flows.projectId, projectId));
    return flow ?? null;
  }

  /**
   * Loads only the stored signature for a project flow, used to short-circuit
   * unchanged updates without copying the full graph payload.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle to join an existing read flow.
   * @returns The persisted signature, or `null` when no flow row exists.
   */
  async findSignatureByProjectId(
    projectId: string,
    tx?: Database,
  ): Promise<string | null> {
    const [row] = await (tx ?? this.db)
      .select({ signature: flows.signature })
      .from(flows)
      .where(eq(flows.projectId, projectId));
    return row?.signature ?? null;
  }

  /**
   * Inserts or updates the stored flow snapshot for a project.
   * @param values Flow insert payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns A promise that resolves when the upsert completes.
   */
  async upsert(values: NewFlow, tx?: Database): Promise<void> {
    await (tx ?? this.db).insert(flows).values(values).onConflictDoUpdate({
      target: flows.projectId,
      set: values,
    });
  }

  /**
   * Loads project logs ordered by timestamp ascending for flow rebuilds.
   * @param projectId Project identifier.
   * @returns Logs ordered oldest first.
   */
  async findProjectLogsOrderedAsc(
    projectId: string,
    tx?: Database,
  ): Promise<Log[]> {
    return (tx ?? this.db)
      .select()
      .from(logs)
      .where(eq(logs.projectId, projectId))
      .orderBy(asc(logs.timestamp));
  }

  /**
   * Loads every integration for a project, used to seed flow nodes.
   * @param projectId Project identifier.
   * @returns Integrations for the project.
   */
  async findProjectIntegrations(
    projectId: string,
    tx?: Database,
  ): Promise<Integration[]> {
    return (tx ?? this.db)
      .select()
      .from(integrations)
      .where(eq(integrations.projectId, projectId));
  }

  /**
   * Loads compact log detail data for all logs in a project.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle to join an existing read flow.
   * @returns Detail summary rows keyed by parent log id.
   */
  async findProjectLogDetailSummaries(
    projectId: string,
    tx?: Database,
  ): Promise<FlowLogDetailSummaryRow[]> {
    return (tx ?? this.db)
      .select({
        body: logDetails.body,
        bodySizeKb: logDetails.bodySizeKb,
        headers: logDetails.headers,
        logId: logDetails.logId,
      })
      .from(logDetails)
      .innerJoin(logs, eq(logDetails.logId, logs.id))
      .where(eq(logs.projectId, projectId));
  }
}
