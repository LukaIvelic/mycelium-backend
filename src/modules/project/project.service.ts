import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { apiKeys, type Project, projects } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyService } from '../api-key/api-key.service';
import type {
  AddApiKeyToProjectResponse,
  CreateProjectDto,
  ProjectSortOptions,
  UpdateProjectDto,
} from './project.dto';
import { ProjectSortDirection, ProjectSortField } from './project.dto';

const MAX_API_KEYS_PER_USER = 3;

/** Manages project ownership, lifecycle, and API key attachment rules. */
@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  /**
   * Finds a project and verifies that the user owns it.
   * @param id Project identifier.
   * @param userId Owner identifier.
   * @returns The matching active project.
   */
  async findOne(id: string, userId: string): Promise<Project> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.validTo)));
    if (!project) throw new NotFoundException(Errors.Project.NotFound(id));
    if (project.userId !== userId)
      throw new ForbiddenException(Errors.Project.NotOwner);
    return project;
  }

  /**
   * Checks whether a project currently has an active API key.
   * @param project Project to inspect.
   * @returns `true` when an active API key exists, otherwise `false`.
   */
  async hasActiveApiKey(project: Project): Promise<boolean> {
    return this.apiKeyService.hasActiveApiKeyForProject(project.id);
  }

  /**
   * Lists active projects for a user with an optional API key filter.
   * @param userId Owner identifier.
   * @param hasApiKey Optional filter for projects with or without active keys.
   * @returns Matching active projects.
   */
  async findByUserId(
    userId: string,
    hasApiKey?: boolean,
    sortOptions?: ProjectSortOptions,
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
   * Finds the project that owns an API key and verifies ownership.
   * @param apiKeyId API key identifier.
   * @param userId Owner identifier.
   * @returns The matching project.
   */
  async findByApiKeyId(apiKeyId: string, userId: string): Promise<Project> {
    const project = await this.apiKeyService.getProjectByApiKeyId(apiKeyId);
    if (project.userId !== userId)
      throw new ForbiddenException(Errors.Project.NotOwner);
    return project;
  }

  /**
   * Creates a new project for a user.
   * @param dto Project creation payload.
   * @param userId Owner identifier.
   * @returns The created project.
   */
  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({
        name: dto.name,
        description: dto.description,
        userId,
      })
      .returning();
    return project;
  }

  /**
   * Updates an existing project.
   * @param project Project to update.
   * @param dto Partial project changes.
   * @returns The updated project.
   */
  async update(project: Project, dto: UpdateProjectDto): Promise<Project> {
    this.validate(dto);

    const data = {
      ...dto,
      updatedAt: new Date(),
    };

    await this.db.update(projects).set(data).where(eq(projects.id, project.id));

    return this.findOne(project.id, project.userId);
  }

  /**
   * Soft deletes a project by setting its validity end date.
   * @param project Project to delete.
   * @returns A promise that resolves when the project is archived.
   */
  async delete(project: Project): Promise<void> {
    await this.db
      .update(projects)
      .set({ validTo: new Date() })
      .where(eq(projects.id, project.id));
  }

  /**
   * Creates an API key for a project if the user has not hit the global limit.
   * @param project Project that will receive the API key.
   * @param name Optional display name for the key.
   * @returns The created API key response payload.
   */
  async addApiKeyToProject(
    project: Project,
    name?: string,
  ): Promise<AddApiKeyToProjectResponse> {
    const activeCount = await this.apiKeyService.countActiveKeysForUser(
      project.userId,
    );
    if (activeCount >= MAX_API_KEYS_PER_USER)
      throw new ConflictException(Errors.Project.MaxApiKeysReached);

    return this.apiKeyService.createApiKey(project.id, name);
  }

  /**
   * Ensures an update payload contains at least one defined value.
   * @param dto Partial project update payload.
   * @returns Nothing.
   */
  private validate(dto: UpdateProjectDto): void {
    const hasNoDefinedValues = Object.values(dto).every((v) => v === undefined);

    if (hasNoDefinedValues) {
      throw new BadRequestException(Errors.User.NoUpdateFields);
    }
  }

  private getProjectOrderBy(sortOptions?: ProjectSortOptions): SQL | undefined {
    if (sortOptions === undefined) return undefined;

    const sortColumn = this.getProjectSortColumn(sortOptions.field);

    if (sortOptions.sort === ProjectSortDirection.Asc) return asc(sortColumn);

    return desc(sortColumn);
  }

  private getProjectSortColumn(field: ProjectSortField) {
    if (field === ProjectSortField.Name) return projects.name;
    if (field === ProjectSortField.RegistrationDate) return projects.createdAt;

    return sql<Date>`coalesce(${projects.updatedAt}, ${projects.createdAt})`;
  }
}
