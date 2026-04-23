import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import {
  AddApiKeyToProjectResponse,
  CreateProjectDto,
  UpdateProjectDto,
} from './project.dto';
import { ApiKeyService } from '../api-key/api-key.service';
import { ApiKey } from '../api-key/entities/api_key.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async findByUserId(user_id: string, hasApiKey?: boolean): Promise<Project[]> {
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.user', 'user')
      .where('project.user_id = :userId', { userId: user_id })
      .distinct(true);

    if (hasApiKey === true) {
      qb.innerJoin(
        ApiKey,
        'ak',
        'ak.project_id = project.id AND ak.revoked_at IS NULL',
      );
    } else if (hasApiKey === false) {
      qb.leftJoin(
        ApiKey,
        'ak',
        'ak.project_id = project.id AND ak.revoked_at IS NULL',
      ).andWhere('ak.id IS NULL');
    }

    return qb.getMany();
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({
      name: dto.name,
      description: dto.description,
      user: { id: dto.user_id },
    });
    return this.projectRepository.save(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.projectRepository.update(id, dto);
    return this.findOne(id);
  }

  async invalidate(id: string): Promise<void> {
    const project = await this.findOne(id);
    project.valid_to = new Date();
    await this.projectRepository.save(project);
  }

  async hasActiveApiKey(projectId: string): Promise<boolean> {
    await this.findOne(projectId);
    return this.apiKeyService.hasActiveApiKeyForProject(projectId);
  }

  async assertUserOwnsProject(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['user'],
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.user.id !== userId)
      throw new ForbiddenException('You do not own this project');
  }

  async addApiKeyToProject(
    projectId: string,
    userId: string,
    name?: string,
  ): Promise<AddApiKeyToProjectResponse> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['user'],
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.user.id !== userId)
      throw new ForbiddenException('You do not own this project');

    const activeKeys = await this.apiKeyService.countActiveKeysForUser(userId);
    if (activeKeys >= 3)
      throw new ConflictException(
        'You can only have active API keys on up to 3 projects',
      );

    return this.apiKeyService.createApiKey(projectId, name);
  }
}
