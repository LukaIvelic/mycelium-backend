import { Injectable, type OnModuleInit } from '@nestjs/common';
import { CountingBloomFilter } from 'bloom-filters';

@Injectable()
export class BloomService implements OnModuleInit {
  private bloom!: CountingBloomFilter;
  private readonly headroomBufferMultiplier = 2;
  private readonly falsePositiveRate = 0.01;

  constructor(private readonly loadHashes: () => Promise<string[]>) {}

  async onModuleInit() {
    const hashes = await this.loadHashes();
    this.bloom = CountingBloomFilter.create(
      Math.max(hashes.length * this.headroomBufferMultiplier, 1_000),
      this.falsePositiveRate,
    );
    for (const hash of hashes) {
      this.bloom.add(hash);
    }
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
