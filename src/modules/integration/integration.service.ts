import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type Integration, integrations } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';

@Injectable()
export class IntegrationService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<Integration> {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id));

    if (!integration) {
      throw new NotFoundException(Errors.Integration.NotFound(id));
    }

    return integration;
  }
}
