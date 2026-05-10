import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
