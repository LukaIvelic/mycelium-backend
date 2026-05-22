import { Inject, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  isNull,
  notExists,
  sql,
} from 'drizzle-orm';
import { apiKeys, type NewProject, type Project, projects } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import {
  ProjectSortDirection,
  ProjectSortField,
  type ProjectSortOptions,
} from './project.dto';

/** Data access for the `projects` table. */
@Injectable()
export class ProjectRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Loads an active project row by id.
   * @param id Project identifier.
   * @returns The matching active project, or `null` when none exists.
   */
  async findActiveById(id: string): Promise<Project | null> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.validTo)));
    return project ?? null;
  }

  /**
   * Loads active projects for a user with optional API-key and sort filters.
   * @param userId Owner identifier.
   * @param hasApiKey Optional filter for projects with or without active keys.
   * @param sortOptions Optional sorting configuration.
   * @returns The matching active projects.
   */
  async findActiveByUserId(
    userId: string,
    hasApiKey: boolean | undefined,
    sortOptions: ProjectSortOptions | undefined,
  ): Promise<Project[]> {
    const activeKeySubquery = this.db
      .select({ one: sql`1` })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.projectId, projects.id), isNull(apiKeys.revokedAt)),
      );

    const conditions = [
      eq(projects.userId, userId),
      isNull(projects.validTo),
      ...(hasApiKey === true ? [exists(activeKeySubquery)] : []),
      ...(hasApiKey === false ? [notExists(activeKeySubquery)] : []),
    ];

    const query = this.db
      .select()
      .from(projects)
      .where(and(...conditions));
    const orderBy = this.getProjectOrderBy(sortOptions);

    if (orderBy === undefined) return query;
    return query.orderBy(orderBy);
  }

  /**
   * Inserts a new project row.
   * @param values Project insert payload.
   * @returns The inserted project.
   */
  async insert(values: NewProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(values).returning();
    return project;
  }

  /**
   * Updates a project row by id.
   * @param id Project identifier.
   * @param values Partial project changes.
   * @returns A promise that resolves when the update completes.
   */
  async update(id: string, values: Partial<Project>): Promise<void> {
    await this.db.update(projects).set(values).where(eq(projects.id, id));
  }

  /**
   * Soft deletes a project by setting its validity end date.
   * @param id Project identifier.
   * @returns A promise that resolves when the project is archived.
   */
  async softDelete(id: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ validTo: new Date() })
      .where(eq(projects.id, id));
  }

  /**
   * Builds the project list ordering expression from sort options.
   * @param sortOptions Optional sorting configuration.
   * @returns The Drizzle SQL ordering expression, or `undefined` when absent.
   */
  private getProjectOrderBy(sortOptions?: ProjectSortOptions): SQL | undefined {
    if (sortOptions === undefined) return undefined;

    const sortColumn = this.getProjectSortColumn(sortOptions.field);

    if (sortOptions.sort === ProjectSortDirection.Asc) return asc(sortColumn);
    return desc(sortColumn);
  }

  /**
   * Resolves a project sort field to its database expression.
   * @param field Requested project sort field.
   * @returns The database column or expression to sort by.
   */
  private getProjectSortColumn(field: ProjectSortField) {
    if (field === ProjectSortField.Name) return projects.name;
    if (field === ProjectSortField.RegistrationDate) return projects.createdAt;
    return sql<Date>`coalesce(${projects.updatedAt}, ${projects.createdAt})`;
  }
}
