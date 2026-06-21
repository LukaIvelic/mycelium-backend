import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { UserModule } from '../user/user.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard';
import { AssistantRateLimiterService } from './assistant-rate-limiter.service';
import { AssistantSqlService } from './assistant-sql.service';
import { OpenAiAssistantProvider } from './openai-assistant.provider';

@Module({
  imports: [JwtAuthModule, UserModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    OpenAiAssistantProvider,
    AssistantSqlService,
    AssistantRateLimitGuard,
    AssistantRateLimiterService,
  ],
})
export class AssistantModule {}
