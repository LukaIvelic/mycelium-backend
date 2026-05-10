import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Errors } from '@/lib/constants/errors';
import { UserService } from '../user/user.service';
import type { TokenDto } from './auth.dto';

/** Handles login, signup, and token issuance for users. */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticates a user and issues a JWT.
   * @param email User email address.
   * @param password Plain-text password to verify.
   * @returns A signed access token payload.
   */
  async login(email: string, password: string): Promise<TokenDto> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException(Errors.User.InvalidCredentials);

    if (!user.passwordHash) {
      throw new UnauthorizedException(Errors.User.InvalidCredentials);
    }
    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) throw new UnauthorizedException(Errors.User.InvalidCredentials);

    const payload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  /**
   * Creates a user account and issues a JWT.
   * @param firstName User first name.
   * @param lastName User last name.
   * @param email User email address.
   * @param password Plain-text password to hash and store.
   * @returns A signed access token payload.
   */
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

  /**
   * Checks whether a user account exists for an email address.
   * @param email User email address.
   * @returns An object indicating whether the account exists.
   */
  async validateUser(email: string): Promise<{ exists: boolean }> {
    const user = await this.userService.findByEmail(email);
    return { exists: !!user };
  }
}
