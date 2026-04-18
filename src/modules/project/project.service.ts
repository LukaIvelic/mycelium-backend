import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async findByUserId(user_id: string): Promise<Project[]> {
    return this.projectRepository.find({ where: { user: { id: user_id } } });
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({ name: dto.name, user: { id: dto.user_id } });
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
}
