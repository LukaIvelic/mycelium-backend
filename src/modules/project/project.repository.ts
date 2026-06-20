import { Inject, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  isNull,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import {
  apiKeys,
  type NewProject,
  type Project,
  type ProjectMember,
  type ProjectMemberRole,
  projectMembers,
  projects,
  users,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import {
  ProjectSortDirection,
  ProjectSortField,
  type ProjectSortOptions,
} from './project.dto';

export interface ProjectMemberSummary {
  createdAt: Date;
  email: string;
  isOwner: boolean;
  projectId: string;
  role: ProjectMemberRole;
  updatedAt: Date;
  userId: string;
}

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
    const memberSubquery = this.db
      .select({ one: sql`1` })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projects.id),
          eq(projectMembers.userId, userId),
          isNull(projectMembers.validTo),
        ),
      );
    const activeKeySubquery = this.db
      .select({ one: sql`1` })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.projectId, projects.id), isNull(apiKeys.revokedAt)),
      );

    const accessCondition = or(
      eq(projects.userId, userId),
      exists(memberSubquery),
    );
    const conditions: SQL[] = [
      isNull(projects.validTo),
      ...(accessCondition ? [accessCondition] : []),
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
   * Loads an active membership role for a user and project.
   * @param projectId Project identifier.
   * @param userId User identifier.
   * @returns The active member role, or `null` when the user is not a member.
   */
  async findActiveMemberRole(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberRole | null> {
    const [member] = await this.db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
          isNull(projectMembers.validTo),
        ),
      );

    return member?.role ?? null;
  }

  /**
   * Lists active project members plus the project owner.
   * @param projectId Project identifier.
   * @returns Project members with public user fields.
   */
  async findMembersByProjectId(
    projectId: string,
  ): Promise<ProjectMemberSummary[]> {
    const [ownerRow] = await this.db
      .select({ email: users.email, project: projects })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(projects.id, projectId));

    if (!ownerRow) return [];

    const memberRows = await this.db
      .select({ email: users.email, member: projectMembers })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          isNull(projectMembers.validTo),
          ne(projectMembers.userId, ownerRow.project.userId),
        ),
      );

    const owner: ProjectMemberSummary = {
      createdAt: ownerRow.project.createdAt,
      email: ownerRow.email,
      isOwner: true,
      projectId: ownerRow.project.id,
      role: 'owner',
      updatedAt: ownerRow.project.updatedAt ?? ownerRow.project.createdAt,
      userId: ownerRow.project.userId,
    };

    return [
      owner,
      ...memberRows.map(({ email, member }) => ({
        createdAt: member.createdAt,
        email,
        isOwner: false,
        projectId: member.projectId,
        role: member.role,
        updatedAt: member.updatedAt,
        userId: member.userId,
      })),
    ];
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
   * Adds or reactivates a project membership.
   * @param projectId Project identifier.
   * @param userId Member user identifier.
   * @param role Role to assign.
   * @param addedByUserId User who granted access.
   * @returns The active membership row.
   */
  async upsertMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    addedByUserId: string,
  ): Promise<ProjectMember> {
    const now = new Date();
    const [member] = await this.db
      .insert(projectMembers)
      .values({
        addedByUserId,
        projectId,
        role,
        updatedAt: now,
        userId,
        validTo: null,
      })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: {
          addedByUserId,
          role,
          updatedAt: now,
          validTo: null,
        },
      })
      .returning();

    return member;
  }

  /**
   * Updates an active project member role.
   * @param projectId Project identifier.
   * @param userId Member user identifier.
   * @param role Role to assign.
   * @returns The updated member, or `null` when no active membership exists.
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember | null> {
    const [member] = await this.db
      .update(projectMembers)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
          isNull(projectMembers.validTo),
        ),
      )
      .returning();

    return member ?? null;
  }

  /**
   * Soft removes a project member.
   * @param projectId Project identifier.
   * @param userId Member user identifier.
   * @returns The removed member, or `null` when no active membership exists.
   */
  async removeMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    const now = new Date();
    const [member] = await this.db
      .update(projectMembers)
      .set({ updatedAt: now, validTo: now })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
          isNull(projectMembers.validTo),
        ),
      )
      .returning();

    return member ?? null;
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
