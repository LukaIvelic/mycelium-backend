import type { ApiKey, Project } from '@/database';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      project?: Project;
      user?: {
        sub: string;
        email?: string;
      };
    }
  }
}
