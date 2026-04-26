import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { normalizeOrigin } from './normalize-origin';
import { RegisteredService } from './registered-service.entity';
import { RegisterServiceDto } from './service-registry.dto';

@Injectable()
export class ServiceRegistryService {
  constructor(
    @InjectRepository(RegisteredService)
    private readonly registeredServiceRepository: Repository<RegisteredService>,
  ) {}

  async register(
    projectId: string,
    apiKeyId: string,
    dto: RegisterServiceDto,
    manager?: EntityManager,
  ): Promise<RegisteredService> {
    console.log(dto);
    const repo = this.resolveRepo(manager);
    const normalizedOrigin = normalizeOrigin(dto.serviceOrigin);
    const payload: Partial<RegisteredService> = {
      project_id: projectId,
      api_key_id: apiKeyId,
      service_origin: dto.serviceOrigin,
      normalized_origin: normalizedOrigin,
      service_key: dto.serviceKey ?? null,
      service_name: dto.serviceName ?? null,
      service_version: dto.serviceVersion ?? null,
      service_description: dto.serviceDescription ?? null,
      service_repository: dto.serviceRepository ?? null,
      updated_at: new Date(),
    };
    await repo.upsert(payload, ['project_id', 'normalized_origin']);

    return repo.findOneOrFail({
      where: { project_id: projectId, normalized_origin: normalizedOrigin },
    });
  }

  async findByProjectId(
    projectId: string,
    manager?: EntityManager,
  ): Promise<RegisteredService[]> {
    return this.resolveRepo(manager).find({
      where: { project_id: projectId },
    });
  }

  async findById(serviceId: string): Promise<RegisteredService> {
    const service = await this.registeredServiceRepository.findOneBy({
      id: serviceId,
    });

    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    return service;
  }

  private resolveRepo(manager?: EntityManager): Repository<RegisteredService> {
    return manager
      ? manager.getRepository(RegisteredService)
      : this.registeredServiceRepository;
  }
}
