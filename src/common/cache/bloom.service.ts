import { Injectable, type OnModuleInit } from '@nestjs/common';
import { CountingBloomFilter } from 'bloom-filters';

/** Maintains a bloom filter of cached hashes for fast membership checks. */
@Injectable()
export class BloomService implements OnModuleInit {
  private bloom!: CountingBloomFilter;
  private readonly headroomBufferMultiplier = 2;
  private readonly falsePositiveRate = 0.01;

  constructor(private readonly loadHashes: () => Promise<string[]>) {}

  /**
   * Loads the initial hash set and seeds the bloom filter.
   * @returns A promise that resolves when the filter is ready.
   */
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

  /**
   * Checks whether the bloom filter may contain a hash.
   * @param hash Hash to look up.
   * @returns `true` when the hash may exist, otherwise `false`.
   */
  has(hash: string): boolean {
    return this.bloom.has(hash);
  }

  /**
   * Adds a hash to the bloom filter.
   * @param hash Hash to add.
   * @returns Nothing.
   */
  add(hash: string): void {
    this.bloom.add(hash);
  }

  /**
   * Removes a hash from the bloom filter.
   * @param hash Hash to remove.
   * @returns Nothing.
   */
  remove(hash: string): void {
    this.bloom.remove(hash);
  }
}
