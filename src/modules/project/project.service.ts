import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Project } from '@/database';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyService } from '../api-key/api-key.service';
import type {
  AddApiKeyToProjectResponse,
  CreateProjectDto,
  ProjectSortOptions,
  UpdateProjectDto,
} from './project.dto';
import { ProjectRepository } from './project.repository';

const MAX_API_KEYS_PER_USER = 3;

/** Manages project ownership, lifecycle, and API key attachment rules. */
@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  /**
   * Finds a project and verifies that the user owns it.
   * @param id Project identifier.
   * @param userId Owner identifier.
   * @returns The matching active project.
   */
  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findActiveById(id);
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
   * @param sortOptions Optional sorting configuration.
   * @returns Matching active projects.
   */
  async findByUserId(
    userId: string,
    hasApiKey?: boolean,
    sortOptions?: ProjectSortOptions,
  ): Promise<Project[]> {
    return this.projectRepository.findActiveByUserId(
      userId,
      hasApiKey,
      sortOptions,
    );
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
    return this.projectRepository.insert({
      name: dto.name,
      description: dto.description,
      userId,
    });
  }

  /**
   * Updates an existing project.
   * @param project Project to update.
   * @param dto Partial project changes.
   * @returns The updated project.
   */
  async update(project: Project, dto: UpdateProjectDto): Promise<Project> {
    this.validate(dto);

    await this.projectRepository.update(project.id, {
      ...dto,
      updatedAt: new Date(),
    });

    return this.findOne(project.id, project.userId);
  }

  /**
   * Soft deletes a project by setting its validity end date.
   * @param project Project to delete.
   * @returns A promise that resolves when the project is archived.
   */
  async delete(project: Project): Promise<void> {
    await this.projectRepository.softDelete(project.id);
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
}
