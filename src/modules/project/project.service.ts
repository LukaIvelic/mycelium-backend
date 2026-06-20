import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Project, ProjectMemberRole } from '@/database';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyService } from '../api-key/api-key.service';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import type {
  AddApiKeyToProjectResponse,
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectMemberResponse,
  ProjectSortOptions,
  UpdateProjectDto,
  UpdateProjectMemberDto,
} from './project.dto';
import { ProjectRepository } from './project.repository';

const MAX_API_KEYS_PER_USER = 3;
const PROJECT_MANAGER_ROLES: ProjectMemberRole[] = ['owner', 'admin'];

/** Manages project ownership, lifecycle, and API key attachment rules. */
@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly apiKeyService: ApiKeyService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
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
    await this.assertCanAccess(project, userId);
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
    await this.assertCanAccess(project, userId);
    return project;
  }

  /**
   * Creates a new project for a user.
   * @param dto Project creation payload.
   * @param userId Owner identifier.
   * @returns The created project.
   */
  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    const project = await this.projectRepository.insert({
      name: dto.name,
      description: dto.description,
      userId,
    });

    await this.projectRepository.upsertMember(
      project.id,
      userId,
      'owner',
      userId,
    );

    return project;
  }

  /**
   * Updates an existing project.
   * @param project Project to update.
   * @param dto Partial project changes.
   * @returns The updated project.
   */
  async update(
    project: Project,
    dto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    this.validate(dto);
    await this.assertCanManage(project, userId);

    await this.projectRepository.update(project.id, {
      ...dto,
      updatedAt: new Date(),
    });

    return this.findOne(project.id, userId);
  }

  /**
   * Soft deletes a project by setting its validity end date.
   * @param project Project to delete.
   * @returns A promise that resolves when the project is archived.
   */
  async delete(project: Project, userId: string): Promise<void> {
    await this.assertIsOwner(project, userId);
    await this.notificationService.createForProjectUsers(project.id, {
      description: `${project.name} was archived.`,
      severity: 'info',
      title: 'Project archived',
      type: 'project_deleted',
    });
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
    userId: string,
    name?: string,
  ): Promise<AddApiKeyToProjectResponse> {
    await this.assertCanManage(project, userId);

    const activeCount = await this.apiKeyService.countActiveKeysForUser(
      project.userId,
    );
    if (activeCount >= MAX_API_KEYS_PER_USER)
      throw new ConflictException(Errors.Project.MaxApiKeysReached);

    return this.apiKeyService.createApiKey(project.id, name);
  }

  /**
   * Lists project members visible to any project participant.
   * @param project Project to inspect.
   * @returns Active members plus the owner.
   */
  findMembers(project: Project): Promise<ProjectMemberResponse[]> {
    return this.projectRepository.findMembersByProjectId(project.id);
  }

  /**
   * Adds or reactivates a project member.
   * @param project Project to update.
   * @param actorUserId User granting access.
   * @param dto Member invitation payload.
   * @returns The resulting member response.
   */
  async addMember(
    project: Project,
    actorUserId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMemberResponse> {
    await this.assertCanManage(project, actorUserId);

    const target = await this.userService.findByEmail(dto.email);
    if (!target) throw new NotFoundException(Errors.User.NotFound(dto.email));

    if (target.id === project.userId) {
      throw new BadRequestException(Errors.Project.CannotChangeOwner);
    }

    await this.projectRepository.upsertMember(
      project.id,
      target.id,
      dto.role,
      actorUserId,
    );
    await this.notificationService.createForUser(target.id, {
      description: `You were added to ${project.name} as ${dto.role}.`,
      projectId: project.id,
      severity: 'info',
      title: 'Project access granted',
      type: 'project_member_added',
    });

    return this.findMember(project.id, target.id);
  }

  /**
   * Updates a member role.
   * @param project Project to update.
   * @param actorUserId User changing access.
   * @param memberUserId Member user id.
   * @param dto Role update payload.
   * @returns The updated member response.
   */
  async updateMember(
    project: Project,
    actorUserId: string,
    memberUserId: string,
    dto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponse> {
    await this.assertCanManage(project, actorUserId);
    this.assertCanChangeMember(project, memberUserId);

    const member = await this.projectRepository.updateMemberRole(
      project.id,
      memberUserId,
      dto.role,
    );
    if (!member) throw new NotFoundException(Errors.Project.MemberNotFound);

    await this.notificationService.createForUser(memberUserId, {
      description: `Your role in ${project.name} changed to ${dto.role}.`,
      projectId: project.id,
      severity: 'info',
      title: 'Project role updated',
      type: 'project_member_role_updated',
    });

    return this.findMember(project.id, memberUserId);
  }

  /**
   * Removes an active member from a project.
   * @param project Project to update.
   * @param actorUserId User removing access.
   * @param memberUserId Member user id.
   * @returns A promise that resolves when access is removed.
   */
  async removeMember(
    project: Project,
    actorUserId: string,
    memberUserId: string,
  ): Promise<void> {
    await this.assertCanManage(project, actorUserId);
    this.assertCanChangeMember(project, memberUserId);

    const member = await this.projectRepository.removeMember(
      project.id,
      memberUserId,
    );
    if (!member) throw new NotFoundException(Errors.Project.MemberNotFound);

    await this.notificationService.createForUser(memberUserId, {
      description: `You were removed from ${project.name}.`,
      projectId: project.id,
      severity: 'info',
      title: 'Project access removed',
      type: 'project_member_removed',
    });
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

  private async findMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberResponse> {
    const members =
      await this.projectRepository.findMembersByProjectId(projectId);
    const member = members.find((item) => item.userId === userId);
    if (!member) throw new NotFoundException(Errors.Project.MemberNotFound);
    return member;
  }

  private async assertCanAccess(
    project: Project,
    userId: string,
  ): Promise<ProjectMemberRole> {
    const role = await this.findRole(project, userId);
    if (!role) throw new ForbiddenException(Errors.Project.NotMember);
    return role;
  }

  private async assertCanManage(
    project: Project,
    userId: string,
  ): Promise<void> {
    const role = await this.assertCanAccess(project, userId);
    if (!PROJECT_MANAGER_ROLES.includes(role)) {
      throw new ForbiddenException(Errors.Project.RoleRequired);
    }
  }

  private async assertIsOwner(project: Project, userId: string): Promise<void> {
    const role = await this.assertCanAccess(project, userId);
    if (role !== 'owner') {
      throw new ForbiddenException(Errors.Project.NotOwner);
    }
  }

  private assertCanChangeMember(project: Project, userId: string): void {
    if (userId === project.userId) {
      throw new BadRequestException(Errors.Project.CannotRemoveOwner);
    }
  }

  private async findRole(
    project: Project,
    userId: string,
  ): Promise<ProjectMemberRole | null> {
    if (project.userId === userId) return 'owner';
    return this.projectRepository.findActiveMemberRole(project.id, userId);
  }
}
