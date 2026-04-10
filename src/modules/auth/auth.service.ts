import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { TokenDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<TokenDto> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
