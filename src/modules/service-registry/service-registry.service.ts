import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ): Promise<RegisteredService> {
    const normalizedOrigin = normalizeOrigin(dto.serviceOrigin);
    await this.registeredServiceRepository.upsert(
      {
        project_id: projectId,
        api_key_id: apiKeyId,
        service_origin: dto.serviceOrigin,
        normalized_origin: normalizedOrigin,
        service_key: dto.serviceKey ?? null,
        service_name: dto.serviceName ?? null,
        service_version: dto.serviceVersion ?? null,
        service_description: dto.serviceDescription ?? null,
        updated_at: new Date(),
      },
      ['project_id', 'normalized_origin'],
    );

    return this.registeredServiceRepository.findOneOrFail({
      where: { project_id: projectId, normalized_origin: normalizedOrigin },
    });
  }

  async findByProjectId(projectId: string): Promise<RegisteredService[]> {
    return this.registeredServiceRepository.find({
      where: { project_id: projectId },
    });
  }
}
