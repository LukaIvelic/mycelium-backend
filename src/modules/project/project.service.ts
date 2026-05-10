import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, exists, isNull, notExists, sql } from 'drizzle-orm';
import { apiKeys, type Project, projects } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyService } from '../api-key/api-key.service';
import type {
  AddApiKeyToProjectResponse,
  CreateProjectDto,
  UpdateProjectDto,
} from './project.dto';

const MAX_API_KEYS_PER_USER = 3;

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly apiKeyService: ApiKeyService,
  ) {}

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

  async hasActiveApiKey(project: Project): Promise<boolean> {
    return this.apiKeyService.hasActiveApiKeyForProject(project.id);
  }

  async findByUserId(userId: string, hasApiKey?: boolean): Promise<Project[]> {
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

    return this.db
      .select()
      .from(projects)
      .where(and(...conditions));
  }

  async findByApiKeyId(apiKeyId: string, userId: string): Promise<Project> {
    const project = await this.apiKeyService.getProjectByApiKeyId(apiKeyId);
    if (project.userId !== userId)
      throw new ForbiddenException(Errors.Project.NotOwner);
    return project;
  }

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

  async update(project: Project, dto: UpdateProjectDto): Promise<Project> {
    this.validate(dto);

    const data = {
      ...dto,
      updatedAt: new Date(),
    };

    await this.db.update(projects).set(data).where(eq(projects.id, project.id));

    return this.findOne(project.id, project.userId);
  }

  async delete(project: Project): Promise<void> {
    await this.db
      .update(projects)
      .set({ validTo: new Date() })
      .where(eq(projects.id, project.id));
  }

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

  private validate(dto: UpdateProjectDto): void {
    const hasNoDefinedValues = Object.values(dto).every((v) => v === undefined);

    if (hasNoDefinedValues) {
      throw new BadRequestException(Errors.User.NoUpdateFields);
    }
  }
}
