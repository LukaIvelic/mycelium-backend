import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiLogin,
  ApiSignup,
  ApiToken,
  ApiValidateUser,
} from './auth.decorator';
import type { LoginDto, SignupDto, TokenDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('authentication')
@Controller('authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiSignup()
  signup(@Body() dto: SignupDto): Promise<TokenDto> {
    return this.authService.signup(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
    );
  }

  @ApiLogin()
  login(@Body() dto: LoginDto): Promise<TokenDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiToken()
  token(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @ApiValidateUser()
  validateUser(@Query('email') email: string) {
    return this.authService.validateUser(email);
  }
}
