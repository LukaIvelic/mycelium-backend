import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { TokenDto } from './auth.dto';
import { Errors } from '@/lib/constants/errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<TokenDto> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException(Errors.User.InvalidCredentials);

    const match = await bcrypt.compare(password, user.passwordHash!);
    if (!match) throw new UnauthorizedException(Errors.User.InvalidCredentials);

    const payload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  async signup(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<TokenDto> {
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) throw new ConflictException(Errors.User.EmailConflict);

    const user = await this.userService.create({
      firstName,
      lastName,
      email,
      password,
    });

    const payload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  async validateUser(email: string): Promise<{ exists: boolean }> {
    const user = await this.userService.findByEmail(email);
    return { exists: !!user };
  }
}
