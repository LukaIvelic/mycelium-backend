import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ValidateUserRateLimitGuard } from '@/modules/auth/auth.guard';
import { UserModule } from '../user/user.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';

const authRateLimiter = {
  provide: 'AUTH_RATE_LIMITER',
  useClass: AuthRateLimiterService,
};

@Module({
  imports: [UserModule, UserProfileModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService, ValidateUserRateLimitGuard, authRateLimiter],
})
export class AuthModule {}
