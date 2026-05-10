import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { Errors } from '@/lib/constants/errors';

const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error(Errors.Auth.MissingJwtSecret);
    return { secret, signOptions: { expiresIn: '7d' } };
  },
});

@Module({
  imports: [jwtModule],
  providers: [JwtGuard],
  exports: [JwtGuard, JwtModule],
})
export class JwtAuthModule {}
