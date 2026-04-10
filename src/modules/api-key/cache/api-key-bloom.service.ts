import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CountingBloomFilter } from 'bloom-filters';
import { ApiKey } from '../entities/api_key.entity';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class ApiKeyBloomService implements OnModuleInit {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  private bloom: CountingBloomFilter;
  private readonly headroomBufferMultiplier = 2;
  private readonly falsePositiveRate = 0.01;

  async onModuleInit() {
    const keys = await this.apiKeyRepository.find({
      where: { valid_to: IsNull() },
    });
    this.bloom = CountingBloomFilter.create(
      Math.max(keys.length * this.headroomBufferMultiplier, 1_000),
      this.falsePositiveRate,
    );
    keys.forEach((k) => this.bloom.add(k.key_hash));
  }

  has(hash: string): boolean {
    return this.bloom.has(hash);
  }

  add(hash: string): void {
    this.bloom.add(hash);
  }

  remove(hash: string): void {
    this.bloom.remove(hash);
  }
}
