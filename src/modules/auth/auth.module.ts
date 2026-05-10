import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { Errors } from '@/lib/constants/errors';
import { ValidateUserRateLimitGuard } from '@/modules/auth/auth.guard';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';

const authRateLimiter = {
  provide: 'AUTH_RATE_LIMITER',
  useClass: AuthRateLimiterService,
};

const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error(Errors.Auth.MissingJwtSecret);
    return { secret, signOptions: { expiresIn: '7d' } };
  },
});

@Module({
  imports: [forwardRef(() => UserModule), jwtModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtGuard,
    ValidateUserRateLimitGuard,
    authRateLimiter,
  ],
  exports: [JwtGuard, JwtModule],
})
export class AuthModule {}
