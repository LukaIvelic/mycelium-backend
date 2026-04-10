import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = this.extractKey(request);
    if (!rawKey) throw new UnauthorizedException();

    const apiKey = await this.apiKeyService.validateApiKey(rawKey);
    if (!apiKey) throw new UnauthorizedException();

    request['apiKey'] = apiKey;
    return true;
  }

  private extractKey(request: Request): string | undefined {
    return request.headers['x-api-key'] as string | undefined;
  }
}
